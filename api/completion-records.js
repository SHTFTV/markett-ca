// Sanitized production evidence only. Never store secrets or customer data here.
export const completionRecords = [
  {
    "contract": {
      "standardVersion": 1,
      "site": "irrigation.ltd",
      "repository": "SHTFTV/irrigation.ltd",
      "sourceCommit": "961d4c128318710265c2dc8023da66cfc2b963a5",
      "sotRef": "https://github.com/SHTFTV/irrigation.ltd/blob/961d4c128318710265c2dc8023da66cfc2b963a5/site/SITE-SOT.md",
      "requirementsRef": "owner-build-brief:irrigation.ltd:2026-11-11",
      "promisedFlows": [
        {
          "id": "publisher",
          "description": "Consumer guides, planner and local brief download; private contractor signup; ongoing sourced cloud publication",
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "checks": [
            "ingestion",
            "generation",
            "media",
            "publishing"
          ]
        },
        {
          "id": "intake",
          "description": "Required private durable intake with honest status and receipt",
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "checks": [
            "forms"
          ]
        },
        {
          "id": "planner-download",
          "description": "Planner calculations and real planning brief download",
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "checks": [
            "connections"
          ]
        }
      ],
      "requirements": {
        "source": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "domain": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "editorial": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "desktop": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "phone": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "sot": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "bot": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "connections": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "unattended": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "state": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "recovery": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "alerts": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "google": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "bing": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "ingestion": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "generation": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "media": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "publishing": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "forms": {
          "applicable": true,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "indexing": {
          "applicable": null,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        },
        "launch": {
          "applicable": null,
          "sourceRef": "owner-build-brief:irrigation.ltd:2026-11-11",
          "maxAgeHours": 24
        }
      }
    },
    "evidence": [
      {
        "site": "irrigation.ltd",
        "repository": "SHTFTV/irrigation.ltd",
        "sourceCommit": "961d4c128318710265c2dc8023da66cfc2b963a5",
        "check": "source",
        "status": "passed",
        "environment": "production",
        "synthetic": false,
        "observedAt": "2026-11-12T00:54:12.924382+00:00",
        "observer": "canonical-completion-audit:GitHub-branch-and-Vercel-production-metadata",
        "proofRef": "https://vercel.com/colins-projects-208e3ca1/irrigation-ltd/Aqz7gFnVsQjBbtDHheX1fkB5KWja",
        "assertions": {
          "githubCanonical": true,
          "vercelLinked": true,
          "exactCommit": true
        }
      },
      {
        "site": "irrigation.ltd",
        "repository": "SHTFTV/irrigation.ltd",
        "sourceCommit": "961d4c128318710265c2dc8023da66cfc2b963a5",
        "check": "domain",
        "status": "passed",
        "environment": "production",
        "synthetic": false,
        "observedAt": "2026-11-12T00:42:12.599945+00:00",
        "observer": "canonical-audit-plus-assigned-domain-navigator",
        "proofRef": "retained-navigator:irrigation.ltd:HTTPS-REDIRECT-CANONICAL-SITEMAP-2026-11-12",
        "assertions": {
          "productionHttps": true,
          "redirects": true,
          "canonical": true,
          "sitemap": true
        }
      }
    ],
    "auditNotes": [
      "Current private GitHub main read through authenticated GitHub connector; exact same source SHA found in READY production Vercel deployment metadata. Runtime/flow completion remains separate.",
      "Forms, unattended runtime, delivered alerts and current deployed SOT loading not proven.",
      "Indexing and IAM launch applicability unresolved; existing Irrigation launch must be reused, never duplicated."
    ],
    "observations": {
      "frontendHttps": 200,
      "sitemapUrls": 29,
      "vantage": "Irrigation independent default-resolver HTTPS; Naturopaths/Fireproofing assigned navigator normal TLS against verified authoritative address. Default resolver negative cache remains a separate observation.",
      "operatingSystemCompletion": false
    }
  },
  {
    "contract": {
      "standardVersion": 1,
      "site": "naturopaths.io",
      "repository": "SHTFTV/naturopaths.io",
      "sourceCommit": "f93b54b281329024b4688e388fac4502a9710b64",
      "sotRef": "https://github.com/SHTFTV/naturopaths.io/blob/f93b54b281329024b4688e388fac4502a9710b64/docs/NATUROPATHS-IO-SOT.md",
      "requirementsRef": "owner-build-brief:naturopaths.io:2026-11-11",
      "promisedFlows": [
        {
          "id": "publisher",
          "description": "Evidence-based consumer education and private professional application; ongoing sourced cloud publication",
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "checks": [
            "ingestion",
            "generation",
            "media",
            "publishing"
          ]
        },
        {
          "id": "intake",
          "description": "Required private durable intake with honest status and receipt",
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "checks": [
            "forms"
          ]
        }
      ],
      "requirements": {
        "source": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "domain": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "editorial": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "desktop": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "phone": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "sot": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "bot": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "connections": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "unattended": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "state": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "recovery": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "alerts": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "google": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "bing": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "ingestion": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "generation": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "media": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "publishing": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "forms": {
          "applicable": true,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "indexing": {
          "applicable": null,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        },
        "launch": {
          "applicable": null,
          "sourceRef": "owner-build-brief:naturopaths.io:2026-11-11",
          "maxAgeHours": 24
        }
      }
    },
    "evidence": [
      {
        "site": "naturopaths.io",
        "repository": "SHTFTV/naturopaths.io",
        "sourceCommit": "f93b54b281329024b4688e388fac4502a9710b64",
        "check": "source",
        "status": "passed",
        "environment": "production",
        "synthetic": false,
        "observedAt": "2026-11-12T00:54:12.924382+00:00",
        "observer": "canonical-completion-audit:GitHub-branch-and-Vercel-production-metadata",
        "proofRef": "https://vercel.com/colins-projects-208e3ca1/naturopaths-io/3Hb6CXUpT8Hf3x3mAU5SNDU6mqcg",
        "assertions": {
          "githubCanonical": true,
          "vercelLinked": true,
          "exactCommit": true
        }
      },
      {
        "site": "naturopaths.io",
        "repository": "SHTFTV/naturopaths.io",
        "sourceCommit": "f93b54b281329024b4688e388fac4502a9710b64",
        "check": "domain",
        "status": "passed",
        "environment": "production",
        "synthetic": false,
        "observedAt": "2026-11-12T00:40:23.023988+00:00",
        "observer": "canonical-audit-plus-assigned-domain-navigator",
        "proofRef": "retained-navigator:naturopaths.io:HTTPS-REDIRECT-CANONICAL-SITEMAP-2026-11-12",
        "assertions": {
          "productionHttps": true,
          "redirects": true,
          "canonical": true,
          "sitemap": true
        }
      }
    ],
    "auditNotes": [
      "Current private GitHub main read through authenticated GitHub connector; exact same source SHA found in READY production Vercel deployment metadata. Runtime/flow completion remains separate.",
      "Forms, unattended runtime, delivered alerts and current deployed SOT loading not proven.",
      "Indexing and IAM launch applicability unresolved; existing Irrigation launch must be reused, never duplicated."
    ],
    "observations": {
      "frontendHttps": 200,
      "sitemapUrls": 21,
      "vantage": "Irrigation independent default-resolver HTTPS; Naturopaths/Fireproofing assigned navigator normal TLS against verified authoritative address. Default resolver negative cache remains a separate observation.",
      "operatingSystemCompletion": false
    }
  },
  {
    "contract": {
      "standardVersion": 1,
      "site": "fireproofing.tv",
      "repository": "SHTFTV/fireproofing.tv",
      "sourceCommit": "c84e7a1c7bc791e8c07e2d5cee14e5edb8420668",
      "sotRef": "https://github.com/SHTFTV/fireproofing.tv/blob/c84e7a1c7bc791e8c07e2d5cee14e5edb8420668/docs/bot/FIREPROOFING-TV-SOT.md",
      "requirementsRef": "owner-build-brief:fireproofing.tv:2026-11-11",
      "promisedFlows": [
        {
          "id": "publisher",
          "description": "Consumer planning guides and private contractor/contribution intake; ongoing sourced cloud publication",
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "checks": [
            "ingestion",
            "generation",
            "media",
            "publishing"
          ]
        },
        {
          "id": "intake",
          "description": "Required private durable intake with honest status and receipt",
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "checks": [
            "forms"
          ]
        }
      ],
      "requirements": {
        "source": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "domain": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "editorial": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "desktop": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "phone": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "sot": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "bot": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "connections": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "unattended": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "state": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "recovery": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "alerts": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "google": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "bing": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "ingestion": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "generation": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "media": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "publishing": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "forms": {
          "applicable": true,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "indexing": {
          "applicable": null,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        },
        "launch": {
          "applicable": null,
          "sourceRef": "owner-build-brief:fireproofing.tv:2026-11-11",
          "maxAgeHours": 24
        }
      }
    },
    "evidence": [
      {
        "site": "fireproofing.tv",
        "repository": "SHTFTV/fireproofing.tv",
        "sourceCommit": "c84e7a1c7bc791e8c07e2d5cee14e5edb8420668",
        "check": "source",
        "status": "passed",
        "environment": "production",
        "synthetic": false,
        "observedAt": "2026-11-12T00:54:12.924382+00:00",
        "observer": "canonical-completion-audit:GitHub-branch-and-Vercel-production-metadata",
        "proofRef": "https://vercel.com/colins-projects-208e3ca1/fireproofing-tv/EsfdjpNSS3Kny8KC1MKLFkpKGSGu",
        "assertions": {
          "githubCanonical": true,
          "vercelLinked": true,
          "exactCommit": true
        }
      }
    ],
    "auditNotes": [
      "Current private GitHub main read through authenticated GitHub connector; exact same source SHA found in READY production Vercel deployment metadata. Runtime/flow completion remains separate.",
      "Forms, unattended runtime, delivered alerts and current deployed SOT loading not proven.",
      "Indexing and IAM launch applicability unresolved; existing Irrigation launch must be reused, never duplicated."
    ],
    "observations": {
      "frontendHttps": 200,
      "sitemapUrls": 20,
      "vantage": "Irrigation independent default-resolver HTTPS; Naturopaths/Fireproofing assigned navigator normal TLS against verified authoritative address. Default resolver negative cache remains a separate observation.",
      "operatingSystemCompletion": false
    }
  }
];
