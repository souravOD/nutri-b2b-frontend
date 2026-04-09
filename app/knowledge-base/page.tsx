"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Copy, ChevronDown, ChevronUp, ShieldCheck, FileText, Globe, ClipboardList, Lock, Siren } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { trackEvent } from "@/lib/analytics"

// ── Template definitions ──────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "cover-letter",
    icon: FileText,
    title: "SOC 2 Type II Cover Letter",
    description: "Vendor attestation letter to share with auditors or enterprise customers requesting compliance evidence.",
    color: "text-[#6366f1]",
    bg: "bg-[#eef2ff]",
    content: `[COMPANY NAME]
Security & Compliance Attestation
Date: [DATE]

To Whom It May Concern,

This letter serves as attestation that [COMPANY NAME] ("the Company") has undergone an
independent SOC 2 Type II audit for the period ending [AUDIT PERIOD END DATE].

The audit was conducted by [AUDIT FIRM NAME], a licensed CPA firm, and assessed the
Company's controls against the Trust Services Criteria established by the AICPA in the
following categories:
  • Security (Common Criteria)
  • Availability
  • Confidentiality

The Company's systems and controls were found to be suitably designed and operating
effectively throughout the audit period.

Key Controls in Scope:
  - Logical and physical access controls
  - Change management procedures
  - Risk monitoring and incident response
  - Encryption in transit (TLS 1.2+) and at rest (AES-256)
  - Annual penetration testing by third-party assessors

A full copy of our SOC 2 Type II report is available under NDA upon request. Please
contact security@[YOURDOMAIN].com to initiate this process.

Sincerely,
[CHIEF SECURITY OFFICER / CTO NAME]
[TITLE]
[COMPANY NAME]
[EMAIL]`,
  },
  {
    id: "security-controls",
    icon: ShieldCheck,
    title: "Security Controls Summary",
    description: "Trust Service Criteria mapping covering CC6–CC9 for access, monitoring, change management, and risk.",
    color: "text-[#059669]",
    bg: "bg-[#ecfdf5]",
    content: `SECURITY CONTROLS SUMMARY — [COMPANY NAME]
SOC 2 Trust Service Criteria (Security Category)
Effective Date: [DATE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC6 — LOGICAL AND PHYSICAL ACCESS CONTROLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC6.1 Role-based access control (RBAC) enforced for all system components.
       Roles: superadmin, vendor_admin, vendor_viewer.
CC6.2 Multi-factor authentication (MFA) required for all admin accounts.
CC6.3 Access reviews conducted quarterly; terminated users de-provisioned within 24h.
CC6.6 Encryption in transit: TLS 1.2+ for all API endpoints.
      Encryption at rest: AES-256 for database storage and backups.
CC6.7 Data transmitted to customers via HTTPS-only endpoints.
CC6.8 Malware protection deployed on all production systems.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC7 — SYSTEM OPERATIONS (MONITORING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC7.1 Infrastructure monitored 24/7 with automated alerting.
CC7.2 Anomaly detection: failed login attempts, unusual export volumes.
CC7.3 Security events logged to immutable audit trail; retained 365 days.
CC7.4 Incident response plan (IRP) activated within 1 hour of confirmed breach.
CC7.5 Recovery time objective (RTO): 4 hours. Recovery point (RPO): 1 hour.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC8 — CHANGE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC8.1 All code changes require peer review via pull request.
      Automated CI/CD pipeline with security scanning (SAST/DAST).
      Production deployments require 2-person approval.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC9 — RISK MITIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CC9.1 Annual risk assessment conducted by third-party security firm.
CC9.2 Vendor due diligence program: all sub-processors reviewed annually.
      Sub-processors: AWS (infrastructure), Stripe (billing), SendGrid (email).
      Annual penetration test conducted; findings remediated within 30 days.`,
  },
  {
    id: "dpa",
    icon: Globe,
    title: "Data Processing Addendum (DPA)",
    description: "GDPR-aligned DPA template defining controller/processor roles, sub-processors, and data retention.",
    color: "text-[#0284c7]",
    bg: "bg-[#f0f9ff]",
    content: `DATA PROCESSING ADDENDUM (DPA)
This Data Processing Addendum ("DPA") forms part of the Master Services Agreement
between [CUSTOMER NAME] ("Controller") and [COMPANY NAME] ("Processor").

1. DEFINITIONS
   "Personal Data" means any information relating to an identified or identifiable
   natural person as defined under GDPR Article 4(1).
   "Processing" has the meaning given in GDPR Article 4(2).

2. SCOPE OF PROCESSING
   Subject matter: Provision of B2B nutrition and wellness platform services.
   Duration: Term of the Master Services Agreement.
   Nature and purpose: Storage, analysis, and reporting of nutritional and
   health-profile data for corporate wellness programs.
   Categories of data subjects: Employees / plan members of the Controller.
   Categories of personal data: Name, email, dietary preferences, health goals,
   activity levels. No special category data (GDPR Art. 9) is collected.

3. CONTROLLER OBLIGATIONS
   Controller warrants it has lawful basis for sharing Personal Data with Processor.
   Controller is responsible for responding to data subject rights requests.

4. PROCESSOR OBLIGATIONS
   Processor shall:
   (a) Process Personal Data only on documented instructions from Controller.
   (b) Ensure persons authorised to process data are bound by confidentiality.
   (c) Implement technical and organisational security measures per Article 32.
   (d) Notify Controller of any Personal Data breach within 72 hours of discovery.
   (e) Delete or return all Personal Data upon termination of services.

5. SUB-PROCESSORS
   Processor maintains an up-to-date list of sub-processors at:
   [COMPANY URL]/security/sub-processors
   Current sub-processors: AWS (US-East-1), Stripe, SendGrid.
   Controller provides general authorisation for sub-processor changes with
   30 days' prior written notice.

6. DATA SUBJECT RIGHTS
   Processor shall assist Controller to fulfil data subject requests within 30 days.
   Self-service data export available via platform Settings > Privacy > Download Data.

7. INTERNATIONAL TRANSFERS
   Data processed within EU/EEA or under Standard Contractual Clauses (SCCs)
   per Commission Implementing Decision (EU) 2021/914.

8. AUDIT RIGHTS
   Controller may audit Processor's compliance once per calendar year with
   30 days' written notice, or immediately following a confirmed breach.

Signed for and on behalf of [COMPANY NAME]:
Name: _________________________ Date: _____________
Title: _________________________`,
  },
  {
    id: "incident-response-plan",
    icon: Siren,
    title: "Incident Response Plan",
    description: "Defined procedures for identifying, responding to, and mitigating potential security breaches or operational incidents.",
    color: "text-[#dc2626]",
    bg: "bg-[#fef2f2]",
    content: `INCIDENT RESPONSE PLAN
[COMPANY NAME] | Version 1.0 | Effective: [DATE]
Owner: Chief Security Officer

━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: DETECT & REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger: Automated alert, customer report, or employee observation.
Action:
  • Report to security@[YOURDOMAIN].com immediately.
  • Create incident ticket in [TICKETING SYSTEM] tagged "SECURITY-INCIDENT".
  • Notify CISO and on-call engineer within 15 minutes.
  • Do NOT discuss publicly or on unencrypted channels.

━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: CONTAIN
━━━━━━━━━━━━━━━━━━━━━━━━━
Target: Within 1 hour of detection.
Action:
  • Isolate affected systems (network segmentation or shutdown).
  • Revoke compromised credentials immediately.
  • Preserve evidence: snapshot affected instances before changes.
  • Block malicious IPs at WAF/network perimeter.
  • Assess scope: which data, systems, and users are affected?

━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: ERADICATE
━━━━━━━━━━━━━━━━━━━━━━━━━
Target: Within 4 hours of containment.
Action:
  • Identify and remove root cause (malware, misconfiguration, vulnerability).
  • Patch or rebuild affected systems from known-good images.
  • Rotate all potentially exposed secrets and API keys.
  • Verify no backdoors or persistence mechanisms remain.
  • Independent security review of affected codebase.

━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: RECOVER
━━━━━━━━━━━━━━━━━━━━━━━━━
Target: RTO 4h / RPO 1h from last clean backup.
Action:
  • Restore services from verified clean backups.
  • Validate data integrity before bringing systems online.
  • Monitor closely for 48 hours post-recovery.
  • Notify affected customers within 72 hours per GDPR Article 33.
  • Update status page with sanitised incident summary.

━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: POST-MORTEM
━━━━━━━━━━━━━━━━━━━━━━━━━
Target: Within 5 business days of resolution.
Action:
  • Conduct blameless post-mortem with all involved parties.
  • Document: timeline, root cause, impact, remediation actions.
  • Identify control gaps and assign owners for remediation.
  • Update this plan if gaps are found.
  • Share sanitised summary with affected customers if applicable.
  • File with CISO and retain for 3 years.

SEVERITY CLASSIFICATION:
  P1 (Critical): Data breach or service outage > 1 hour  → CEO + legal notified
  P2 (High):     Suspected breach or partial outage       → CISO notified
  P3 (Medium):   Anomalous activity, no confirmed impact  → Security team only
  P4 (Low):      Policy violations, no data risk          → Manager notified`,
  },
  {
    id: "employee-handbook",
    icon: Lock,
    title: "Employee Security Handbook",
    description: "Internal policy guidelines for employees regarding workstation security, passwords, and acceptable use.",
    color: "text-[#7c3aed]",
    bg: "bg-[#f5f3ff]",
    content: `EMPLOYEE SECURITY HANDBOOK
[COMPANY NAME] | Version 1.0 | Effective: [DATE]
Owner: Chief Security Officer

This handbook outlines your responsibilities as an employee to protect company and
customer data. Non-compliance may result in disciplinary action.

━━━━━━━━━━━━━━━━━━━━━━━━━
1. PASSWORD MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━
• Minimum 12 characters; mix upper/lower, numbers, symbols.
• Use the company-approved password manager ([TOOL NAME]) for all credentials.
• Never share passwords with colleagues, vendors, or support staff.
• Enable MFA on all work accounts — no exceptions.
• Report suspected compromised credentials to security@ immediately.

━━━━━━━━━━━━━━━━━━━━━━━━━
2. WORKSTATION SECURITY
━━━━━━━━━━━━━━━━━━━━━━━━━
• Lock your screen (Win+L / Cmd+Ctrl+Q) whenever you step away.
• Auto-lock enabled at 10 minutes — do not disable.
• Full-disk encryption (BitLocker / FileVault) must remain active.
• No personal devices may connect to corporate systems without MDM enrollment.
• Software installation requires IT approval — no exceptions.

━━━━━━━━━━━━━━━━━━━━━━━━━
3. EMAIL & PHISHING
━━━━━━━━━━━━━━━━━━━━━━━━━
• Do not click links in unexpected emails — verify with sender directly.
• Suspicious emails: forward to security@[YOURDOMAIN].com, then delete.
• External email is labelled [EXTERNAL] — apply extra scrutiny.
• Attachments from unknown senders: do not open; report to IT.
• We will NEVER ask for your password via email or chat.

━━━━━━━━━━━━━━━━━━━━━━━━━
4. DATA HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━
• Customer data must not leave approved systems (no personal drives, Dropbox etc.).
• Use company-approved cloud storage ([TOOL]) for all work files.
• Data classification: Public / Internal / Confidential / Restricted.
• Restricted data (PII, financial): encrypted transfer only; need-to-know access.
• Printing of Confidential/Restricted data requires manager approval.

━━━━━━━━━━━━━━━━━━━━━━━━━
5. ACCEPTABLE USE
━━━━━━━━━━━━━━━━━━━━━━━━━
• Company devices are for business use; incidental personal use is permitted.
• Prohibited: torrents, illegal content, circumventing security controls.
• No crypto mining or personal commercial activity on company systems.
• Remote work: use VPN when accessing internal resources from outside office.
• Public Wi-Fi: always connect via VPN; assume network is hostile.

━━━━━━━━━━━━━━━━━━━━━━━━━
6. INCIDENT REPORTING
━━━━━━━━━━━━━━━━━━━━━━━━━
• Report immediately (do not wait): security@[YOURDOMAIN].com or Slack #security.
• What to report: lost device, suspected phishing click, unusual account behaviour.
• Do not attempt to investigate or remediate yourself — escalate immediately.
• No blame culture: early reporting is rewarded, not punished.

I have read and understood this handbook:
Name: _________________________ Date: _____________
Signature: _____________________`,
  },
  {
    id: "vendor-risk-assessment",
    icon: ClipboardList,
    title: "Vendor Risk Assessment",
    description: "Questionnaire and evaluation framework for assessing the security posture of third-party service providers.",
    color: "text-[#d97706]",
    bg: "bg-[#fffbeb]",
    content: `VENDOR RISK ASSESSMENT QUESTIONNAIRE
[COMPANY NAME] | Third-Party Security Review
Vendor Name: _________________________ Date: _____________
Assessor: _________________________

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A: VENDOR PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━
A1. Vendor legal name and primary business address:
A2. Primary contact for security matters (name, email, phone):
A3. Describe the service/data being provided to [COMPANY NAME]:
A4. Will the vendor have access to Personal Data?  □ Yes  □ No
    If Yes, categories of data: ___________________________
A5. Will the vendor sub-contract any work?  □ Yes  □ No
    If Yes, list sub-contractors: _________________________

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION B: SECURITY CERTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━
B1. Does your organisation hold any of the following? (tick all that apply)
    □ SOC 2 Type II   □ ISO 27001   □ PCI DSS   □ HIPAA   □ FedRAMP
    □ CSA STAR        □ Other: _____________________________
    Provide report/certificate reference and expiry date:

B2. When was your last third-party security audit?
    Date: _____________  Auditor: _________________________

B3. Do you conduct annual penetration testing?  □ Yes  □ No
    If Yes, last test date: ____________  Firm: ____________

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION C: DATA SECURITY
━━━━━━━━━━━━━━━━━━━━━━━━━
C1. Encryption in transit:  □ TLS 1.2+  □ TLS 1.0/1.1  □ None
C2. Encryption at rest:     □ AES-256   □ AES-128      □ None
C3. Data residency (regions where data is stored): ___________
C4. Data retention period: ____________
    Deletion process upon contract termination: _______________
C5. Access control model:  □ RBAC  □ ABAC  □ Other: __________
    MFA enforced for admin access?  □ Yes  □ No

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION D: INCIDENT RESPONSE
━━━━━━━━━━━━━━━━━━━━━━━━━
D1. Do you have a documented Incident Response Plan?  □ Yes  □ No
D2. SLA for notifying customers of a data breach:
    □ <24 hours  □ 24-48 hours  □ 48-72 hours  □ >72 hours
D3. Have you experienced a data breach in the past 3 years?  □ Yes  □ No
    If Yes, describe (nature, date, remediation): ____________

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION E: BUSINESS CONTINUITY
━━━━━━━━━━━━━━━━━━━━━━━━━
E1. Recovery Time Objective (RTO): ___________
E2. Recovery Point Objective (RPO): __________
E3. Uptime SLA offered: ___________%
E4. Last DR test date: _____________  Results: _______________

━━━━━━━━━━━━━━━━━━━━━━━━━
RISK RATING (Internal Use)
━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Risk:  □ Low  □ Medium  □ High  □ Critical
Approved by: ___________________________ Date: ___________
Next review due: ___________`,
  },
]

// ── Template Card Component ───────────────────────────────────────────────────

function TemplateCard({ tpl }: { tpl: typeof TEMPLATES[0] }) {
  const { toast } = useToast()
  const [expanded, setExpanded] = React.useState(false)
  const Icon = tpl.icon

  const PREVIEW_LINES = 6
  const lines = tpl.content.split("\n")
  const previewText = lines.slice(0, PREVIEW_LINES).join("\n")
  const hasMore = lines.length > PREVIEW_LINES

  function copy() {
    navigator.clipboard.writeText(tpl.content).then(() => {
      toast({ title: "Copied to clipboard", description: `"${tpl.title}" template copied.` })
    }).catch(() => {
      toast({ title: "Copy failed", description: "Use Ctrl+A to select and copy manually.", variant: "destructive" })
    })
  }

  return (
    <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
      <CardHeader className="border-b border-[#f1f5f9] pb-4 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tpl.bg}`}>
              <Icon className={`h-4.5 w-4.5 ${tpl.color}`} />
            </div>
            <div>
              <CardTitle className="text-[14px] font-bold text-[#0f172a] leading-tight">{tpl.title}</CardTitle>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 h-8 px-3 text-[12px] border-[#cbd5e1] text-[#334155] gap-1.5"
            onClick={copy}
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>
        <CardDescription className="text-[13px] text-[#64748b] mt-2">{tpl.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Template Preview sub-header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#f1f5f9] bg-white">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            Template Preview
          </span>
          <span className="text-[10px] font-medium text-[#94a3b8]">{lines.length} Lines</span>
        </div>
        <pre className="text-[11px] leading-[1.6] text-[#334155] bg-[#f8fafc] p-4 overflow-x-auto whitespace-pre-wrap font-mono flex-1">
          {expanded ? tpl.content : previewText}
          {!expanded && hasMore && "\n..."}
        </pre>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 justify-center w-full py-2 text-[11px] font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] border-t border-[#f1f5f9] transition-colors uppercase tracking-wide"
          >
            {expanded
              ? <><ChevronUp className="h-3.5 w-3.5" /> Collapse</>
              : <><ChevronDown className="h-3.5 w-3.5" /> Show Full Template ({lines.length} Lines)</>
            }
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  React.useEffect(() => { trackEvent("page_view", { page: "knowledge-base" }) }, [])

  return (
    <AppShell>
      <div className="-mx-4 md:-mx-6 -my-4 bg-[#f8fafc] min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-8">

          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList className="text-[#64748b]">
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Portal</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-[#0f172a]">Knowledge Base</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00438f]">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#0f172a]">Compliance & Security Docs</h1>
              <p className="text-[14px] text-[#64748b] mt-0.5">
                Ready-to-use SOC 2 document templates. Click Copy on any card to add to your compliance package.
              </p>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-[#2563eb] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#1e40af]">
              These are <strong>template drafts</strong> — replace bracketed placeholders like{" "}
              <code className="bg-[#dbeafe] px-1 rounded text-[11px]">[COMPANY NAME]</code> with your actual details before sending to customers or auditors.
            </p>
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {TEMPLATES.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </div>

          {/* Footer note */}
          <p className="text-[12px] text-[#94a3b8] text-center pb-4">
            These templates are a starting point — consult your legal counsel and auditor before distributing compliance documentation.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
