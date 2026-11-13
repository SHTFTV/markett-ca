import json, tempfile, unittest
from pathlib import Path
import runner

class IsolationTests(unittest.TestCase):
    def test_malformed_source_is_caught_before_batch_boundary(self):
        receipt,items=runner.guarded_probe({'id':'bad','name':'bad','enabled':True,'officialCandidateUrl':'file:///etc/passwd'},'now')
        self.assertEqual(receipt['status'],'error');self.assertEqual(items,[])

    def test_held_site_and_exception_do_not_block_other_sources_and_restart_dedupes(self):
        config={'sites':[{'site':'held.example','publicationHold':'production rejected','sources':[{'id':'bad','name':'Bad'},{'id':'good','name':'Good'}]},
                         {'site':'other.example','sources':[{'id':'good','name':'Good'}]}]}
        def probe(s,now):
            if s['id']=='bad':raise RuntimeError('adapter failed')
            return {'status':'fetched','feeds':[]},[{'url':'https://source.example/story?utm_source=test','sourcePublishedAt':'2026-11-01T00:00:00+00:00','title':'Story'}]
        with tempfile.TemporaryDirectory() as tmp:
            db=Path(tmp)/'state.sqlite';out=Path(tmp)/'out'
            first=runner.run(config,db,out,probe=probe)
            second=runner.run(config,db,out,probe=probe)
            self.assertEqual(sum(s.get('newItems',0)for s in first['sources']),2)
            self.assertEqual(sum(s.get('newItems',0)for s in second['sources']),0)
            self.assertEqual([s['queuedMetadataItems']for s in second['sites']],[1,1])
            self.assertTrue(any(s['status']=='backoff'for s in second['sources']))
            handoff=json.loads((out/'held.example.json').read_text())
            self.assertEqual(handoff['publicationHold'],'production rejected')
            self.assertFalse(handoff['livePublicationVerified'])
            self.assertFalse(handoff['latestDatedDiscoveryItem']['publicationEligible'])
        self.assertEqual(runner.canonical_url('https://source.example/story?utm_source=a#top'),'https://source.example/story')

if __name__=='__main__':unittest.main()
