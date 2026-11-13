import copy,json,tempfile,unittest
from pathlib import Path
import operation_preflight as p

class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.register={'schemaVersion':1,'version':'test','canonicalRef':'fixture','authorizedIndependentSites':['one','two'],
                       'siteApplicability':[{'site':'one'},{'site':'two'}],
                       'cases':[{'id':'held','site':'one','operation':'unattended_repository_write','state':'rejected-held','reason':'Exact persistent write scope rejected','requiredPreflight':['exact-authorization']}],'approvals':[]}
    def test_known_write_hold_does_not_block_read_or_other_site(self):
        self.assertEqual(p.evaluate(self.register,'one','unattended_repository_write')['status'],'held')
        for site in ['one','two']:
            self.assertEqual(p.evaluate(self.register,site,'public_metadata_fetch',permissions=['public-network:GET'])['status'],'verified-for-independent-read-only-discovery')
    def test_scope_not_transferred_and_unknown_never_passes(self):
        for operation in ['production_secret_change','production_content_release','unattended_repository_write']:
            self.assertEqual(p.evaluate(self.register,'two',operation,{'repository':'unrelated'},['contents:write'])['status'],'missing')
        self.assertEqual(p.evaluate(self.register,'unknown','public_metadata_fetch')['status'],'missing')
        self.assertEqual(p.evaluate(self.register,'one','public_metadata_fetch',permissions=['contents:write'])['status'],'missing')
    def test_actual_load_hash_and_per_site_receipts_do_not_claim_publisher_adoption(self):
        with tempfile.TemporaryDirectory()as tmp:
            path=Path(tmp)/'register.json';path.write_text(json.dumps(self.register))
            digest=p.audit(path,{'sites':[{'site':'one','sources':[]},{'site':'two','sources':[]}]},tmp)
            report=json.loads((Path(tmp)/'operation-preflight-audit.json').read_text())
            self.assertEqual(len(report['rows']),2)
            self.assertEqual(report['registerSha256'],digest)
            self.assertTrue(all(r['existingPublisherLoadedSotVersion'] is None for r in report['rows']))
            self.assertTrue(all(not r['globalPublishingHold']for r in report['rows']))

if __name__=='__main__':unittest.main()
