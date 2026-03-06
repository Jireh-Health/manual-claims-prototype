# Spec Doc: Manual Invoice Processing (Single & Bulk)

| Field | Value |
|-------|-------|
| Author | Athman Gude |
| Published | Jan 20, 2026 |
| Parent | Streamlining Jireh Payments |
| Reviewers | Terach F., David N., Duncan G., Azadi Gathui |
| Approvers | Terach F. |
| Status | In Review |

---

## 1. Overview

This module facilitates the manual submission of invoices by providers who do not have direct API integrations. To reduce friction and data entry errors, the system utilizes a **Local-First Processing** approach. Users upload files (PDF, CSV, Excel), and the browser processes them locally to extract data *before* any data is sent to the server. This ensures data privacy, speed, and allows the user to verify extraction accuracy immediately. Once verified and submitted, funds move into a digital wallet for manual disbursement via a dedicated financial management interface.

---

## 2. Core Features

### 2.1. File Agnosticism & Local Extraction

- **Capability:** The system accepts various formats for both single and bulk invoices, including **PDF, JPG, PNG, CSV, and XLSX**. This allows providers to upload multi-page PDFs or images of invoice lists for bulk processing, not just structured spreadsheets.
- **Local Logic:** Instead of uploading the raw file to Jireh's servers immediately, a browser-based parser (OCR for images/PDFs, Parsing for Spreadsheets) extracts the critical billing data. Crucially, this includes **Invoice Items** (line-item details of services/medication provided), alongside **Invoice Number** and **Amount**. *Note: Patient Name is not a mandatory extraction field, but Item details are required for auditing.*
- **Intelligent Auto-Mapping:** The system utilizes smart heuristics to automatically detect column headers and data structures in bulk files. Manual column mapping is presented only as a **last resort** if the system cannot confidently identify the required fields (Invoice #, Amount, and Items).
- **Compliance Traceability:** The original file is uploaded to Jireh's servers at the point of submission to provide an immutable link for regulatory audits.

### 2.2. The Verification Table (Staging Area)

Before submission, data sits in a "Staging Table."

- **Editable:** Users can correct OCR errors (e.g., if "500" was read as "5000", or "Paracetamol" was read as "Parasail").
- **Reactive Calculations:** Once corrections are made, the system locally updates any arithmetic pertaining to totals (such as "Total Batch Value") with the corrected values immediately, ensuring the summary reflects the user's edits before API verification.
- **Validation:** Users trigger a "Verify against Jireh" action. This sends *only* the data (not the file) to the API to check validity.

### 2.3. Invoices Dashboard

The Invoices Dashboard acts as a unified command center for providers to track and reconcile their financial history. Rather than a static list, it offers a dynamic table view where every submission is tracked by its date, invoice identifier, and total value. The status of each invoice is clearly visible, allowing users to instantly distinguish between items that are processing, fully settled, or rejected. Direct actions are available to **View Details** (which expands to show the specific **Invoice Items** captured), or download remittance advice. To facilitate easy management of large datasets, the dashboard is equipped with robust filtering tools. Providers can drill down to view only unsettled invoices for immediate action, filter history by specific date ranges such as the last 30 days, or use the search function to pinpoint specific invoice numbers, ensuring that no payment ever slips through the cracks.

### 2.4. Wallet (Management Screen)

The Wallet screen is dedicated to financial liquidity and wallet management, displaying the total available funds from all settled invoices. This interface utilizes a dual-tabbed view to clearly separate active liquidity in the **Wallet** tab from historical payouts found in the **History** tab. Within this screen, administrators can perform selective disbursements by choosing specific invoices or using a "Select All" function to trigger a payout via the system's preconfigured M-Pesa Paybill and account number, which routes funds to any bank. To ensure accurate accounting, the system captures detailed reconciliation data within the history logs, including the initiator, timestamp, amount, and the M-Pesa confirmation reference number.

---

## 3. Invoice & Wallet Lifecycle

To ensure a clear accounting trail, every invoice follows a strict state transition path from the initial service to the final disbursement of cash.

### 3.1. The Submission Phase

All invoices start in the **unsubmitted** state, representing records in Jireh's ledger that have not yet been processed by the provider. When a user performs an upload, the data is staged locally for review. If any discrepancies are found during the API verification step—such as an amount mismatch—the record is flagged for the user to address. Once the user reviews the details and hits the submit button, the record is officially considered **submitted**.

### 3.2. The Settlement Phase (Automatic)

Because the verification happens against a pre-existing ledger, the progression from a submitted state to actual liquidity is automatic. The system enters a brief **settling** state as the internal ledger updates the provider's balance. This process concludes quickly, resulting in a **settled** status. Funds in this state appear as individual line items within the Wallet tab, contributing to the total balance available for disbursement.

### 3.3. The Disbursement Phase (Manual)

Disbursement is a manual, admin-led process that moves funds from the Jireh environment to the provider's external accounts. When an admin initiates a payout for selected invoices, the status transitions to **disbursing** while the transaction is being processed by the bank or mobile network operator. Successful transfers result in a **disbursed** status, and the records move from the active wallet list to the history log. If a transfer fails due to external issues, it is marked as **disbursement failed**, and the specific invoices are returned to the active wallet list so the admin can try again or select a different payment channel.

---

## 4. User Flows

### 4.1. Flow A: Single Invoice (Small Provider)

**Ideal for:** Individual doctors or small clinics processing one patient at a time.

For individual practitioners and smaller clinics, the single invoice workflow begins simply with a drag-and-drop action of the invoice file—whether it be a PDF or an image—directly into the browser. Immediately upon upload, the system initiates a local scanning process, utilizing browser-based OCR to extract key data points without sending the file to the server. The user is then presented with a review modal to cross-check the extracted data fields. **Crucially, this view lists the extracted 'Invoice Items' (e.g., 'Consultation Fee', 'Lab Test')**, allowing the provider to verify that the service details were captured correctly alongside the invoice number and total amount. This interface allows for immediate correction of any extraction errors. Once satisfied, the user triggers a verification check against the Jireh API. The system provides instant feedback: a green checkmark indicates a match with internal records, while an error message highlights discrepancies like amount mismatches. Only after this validation step does the user confirm the submission, saving the structured data as a verified invoice.

### 4.2. Flow B: Bulk Invoice (Large Provider)

**Ideal for:** Hospitals or networks processing weekly/monthly batches.

Designed for hospitals and larger networks managing high volumes, the bulk invoice workflow accepts multi-row files in formats like CSV, Excel, or batched PDFs. Upon upload, the system attempts to auto-detect the file structure to identify headers and rows; if the format is unrecognized, it prompts the user to map columns (e.g., identifying which column contains the Invoice Number, Amount, and **Invoice Items/Description**) as a last resort. The data is then populated into a local staging table grid, where **Invoice Items** are visible and editable. The user initiates a batch verification, sending the data to the API for validation. The interface visually segments the results: valid rows where the invoice number and amount match Jireh records turn green, rows with unknown invoice numbers turn red, and rows with matching numbers but conflicting amounts turn yellow. The user can then resolve these exceptions by editing values to fix typos, deleting invalid rows, or choosing to proceed by submitting only the valid green rows.

---

## 5. Validation Logic (API Interaction)

The verification step checks data points against the Jireh Backend and ensures data integrity:

| State | Invoice Number | Amount | Invoice Items | UI Feedback | Action |
|-------|---------------|--------|---------------|-------------|--------|
| **Valid** | Found | Matches | Present | Green Check | Ready to Submit |
| **Amount Mismatch** | Found | **Mismatch** | Present | Yellow Warning: "Jireh expects KES 2,300" | User must correct amount or contest |
| **Missing Items** | Found | Matches | **Empty/Null** | Red Warning: "Missing Service Details" | User must enter what was billed |
| **Unknown Invoice** | **Not Found** | N/A | N/A | Red Error: "Invoice not found" | User must correct number or remove |
| **Duplicate** | Found | Matches | Present | Orange Warning: "Already submitted" | Block submission |

---

## 6. Scenarios

### 6.1. Scenario: Local-First Privacy & Extraction

**Goal:** Extract invoice data locally without transmitting sensitive files to the server prematurely.

**Experience:** A doctor drops an image of a patient invoice into the browser. The browser-based parser instantly extracts the invoice number and amount locally without any loading spinner waiting for a server upload. The file is only transmitted to Jireh's servers for compliance tracing once the doctor explicitly clicks "Submit" after successful API validation.

### 6.2. Scenario: Reactive Calculations in Staging Grid

**Goal:** See real-time batch value updates while correcting extracted data.

**Experience:** During a bulk upload of 20 invoices, the system extracts a consultation fee as 2,000 KES instead of 20,000 KES. The admin spots this in the staging grid and edits the cell. Instantly, the "Total Batch Value" displayed at the top of the screen increases by 18,000 KES before any API verification is triggered.

### 6.3. Scenario: Invoices Dashboard Management & Filtering

**Goal:** Quickly locate specific unsubmitted invoices and track recently submitted invoices.

**Experience:** A clinic manager uses the Invoices Dashboard to filter for "Unsubmitted" status to see what needs processing this week. After finding the records, she switches the filter to "Processing" to check on invoices submitted yesterday, easily locating a specific invoice using the search bar to confirm it hasn't been rejected.

### 6.4. Scenario: Handling Duplicate and Missing Item Errors

**Goal:** Prevent submission of duplicate invoices and ensure mandatory service items are provided.

**Experience:** A hospital admin uploads a CSV containing yesterday's invoices. Upon clicking "Verify All," one row turns Orange with an "Already submitted" warning, preventing double billing. Another row turns Red indicating "Missing Service Details" because the description column was blank. The admin deletes the duplicate row and types "Lab Test" into the red row, re-verifies, and successfully submits the batch.

### 6.5. Scenario: Selective Disbursement Execution

**Goal:** Select specific settled invoices to disburse a targeted amount via the preconfigured M-Pesa Paybill.

**Experience:** An admin opens the Wallet tab and sees 500,000 KES available across 50 settled invoices. Instead of disbursing everything, they use the checkboxes to select 10 specific high-value invoices totaling 250,000 KES. They click "Disburse." A confirmation step appears showing the selected invoice count, total amount, and a system-generated code (e.g., `DISB-7X4K`). The admin must type the code exactly into an input field before the "Confirm Disburse" button becomes active. Once confirmed, the system routes the payout through the preconfigured M-Pesa Paybill and account number. The invoices move to "Disbursing" and subsequently to the History tab with the M-Pesa reference number logged.

### 6.6. Scenario: Single Invoice OCR Correction

**Goal:** Submit a single invoice where the OCR misreads the amount or item description.

**Experience:** Dr. Amina uploads a PDF invoice where the local OCR engine misreads the amount as "50.00" instead of "5000". She manually updates the field in the review modal. The system verifies the new value against Jireh's ledger, confirms the match, and uploads the PDF for compliance once she submits the invoice.

### 6.7. Scenario: Disbursement Failure & Retry

**Goal:** Retry a disbursement after a payout fails due to a transient M-Pesa or network error.

**Experience:** An admin initiates a 100,000 KES disbursement. The M-Pesa Paybill request times out and the status flips to "Disbursement Failed." The invoices are immediately unlocked in the Wallet so no funds are stuck. The admin clicks "Retry" and the system resubmits the request through the same preconfigured M-Pesa Paybill. The payout completes successfully, appearing in the History tab with a unique M-Pesa confirmation reference number.

### 6.8. Scenario: Column Mapping (Unknown Structure)

**Goal:** Upload a file with a non-standard format ensuring line items are captured.

**Experience:** An admin uploads a legacy system report. The system prompts the user to identify the correct columns for "Invoice #," "Total," and "Description" using a sample row. The system saves this mapping for all future uploads from that facility, automating the remainder of the session.

### 6.9. Scenario: Detailed Disbursement Audit

**Goal:** Verify which invoices were paid out in a large historical transaction.

**Experience:** A finance manager reconciles a bank deposit by clicking the payout in the History tab. A side drawer opens, showing the 142 individual invoices that made up the deposit, including specific item breakdowns for each patient, allowing for instant internal reconciliation.

### 6.10. Scenario: Compliance Documentation & Partial Bulk Persistence

**Goal:** Ensure engineering understands how source files are handled for regulatory compliance during partial batch submissions.

**Experience:** When a hospital admin submits 45 valid rows from a 50-row PDF, the entire PDF is uploaded and linked to those 45 invoices as source evidence. The 5 flagged invoices remain in the staging area. When the admin later uploads a correction CSV for those 5, the new CSV is also uploaded and linked to the final invoices, ensuring 100% audit coverage via two source documents.

### 6.11. Scenario: Bulk Upload with Mixed Results

**Goal:** Process a spreadsheet where some invoices match and others don't.

**Experience:** The Admin uploads March_Claims.xlsx (50 rows). The Staging Table loads, displaying columns for Invoice #, Amount, and Description. She clicks "Verify."

- 45 rows turn Green.
- 3 rows turn Red (Invoice numbers typed incorrectly in her Excel).
- 2 rows turn Yellow (Amounts are off by 1 shilling).

She deletes the 3 Red rows. She corrects the 2 Yellow rows to match the Jireh expected amount. She clicks "Submit 50 Invoices".

### 6.12. Scenario: Disbursement Outcomes — Success and Failure

**Goal:** Understand the full range of outcomes when an admin initiates a disbursement, including what the system communicates and what actions are available in each case.

**Success outcome:**

An admin opens the Wallet tab and selects 8 settled invoices totaling 180,000 KES. They click "Disburse." A confirmation step appears displaying a summary of the payout (invoice count, total amount) alongside a system-generated code (e.g., `DISB-9M2R`). The admin types the code exactly into the input field — the "Confirm Disburse" button remains disabled until the code matches. Once confirmed, the selected invoices immediately move to a "Disbursing" state and become non-interactive to prevent duplicate actions. Within moments, the system receives a success callback from M-Pesa. The invoices transition to "Disbursed," disappear from the active Wallet list, and appear in the History tab with the payout timestamp, the initiating admin's name, the total amount, and the M-Pesa confirmation reference number. The remaining wallet balance updates to reflect the deduction.

**Error outcomes:**

The following failure cases can occur after a disbursement is initiated:

- **Network/timeout failure:** M-Pesa does not respond within the expected window. The invoices return to "Settled" in the active Wallet list with a "Disbursement Failed" badge. A banner displays: *"Payout could not be completed. Please try again."* The admin retries using the same preconfigured M-Pesa Paybill.
- **Invalid Paybill or account number:** The preconfigured Paybill or account number is rejected by M-Pesa. The invoices are unlocked in the Wallet, and the error message specifies: *"Paybill validation failed. Please contact support to update the disbursement configuration."* No retry is possible until the configuration is corrected by an authorized administrator.
- **Partial failure (bulk payout):** When disbursing a large batch, M-Pesa may confirm some transfers while rejecting others. Successfully transferred invoices move to "Disbursed" in the History tab. Failed ones return to the Wallet with individual "Disbursement Failed" badges, allowing the admin to retry each independently without affecting the completed payouts.

In all error cases, no funds leave the Jireh environment and the wallet balance remains unchanged until a successful disbursement is confirmed.

---

## 7. User Stories

### 7.1. Flow A: Single Invoice (Small Provider)

| Title | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| **Local OCR Extraction** | As a Small Provider, I want my invoice to be scanned locally in my browser, so that my sensitive files are not uploaded until I am ready to submit. | 1. System accepts PDF, JPG, PNG via drag-and-drop. 2. OCR extracts Invoice #, Amount, and line items (Description). 3. Extraction happens locally without network calls for the file. |
| **Side-by-Side Review** | As a Provider, I want to see a side-by-side view of the invoice image and extracted fields, so that I can easily verify accuracy. | 1. Modal displays original document image on the left. 2. Editable fields (Invoice #, Amount, Items) appear on the right. 3. Line items are displayed as a list or table for clarity. |
| **Manual Correction & Recalculation** | As a Provider, I want to manually edit any misread data points, so that the invoice submission is accurate. | 1. All extracted fields are editable. 2. Changing line item amounts updates the "Total Amount" field automatically. 3. System prevents submission of empty mandatory fields. |
| **Instant API Verification** | As a Provider, I want to verify my invoice data against Jireh's records, so that I know the invoice will be accepted. | 1. "Verify" button triggers an API check for Invoice # and Amount. 2. Visual feedback (Green/Yellow/Red) is displayed based on validation logic. 3. Error messages specifically state if the amount mismatches Jireh's expected value. |
| **Single Invoice Submission** | As a Provider, I want to finalize my verified invoice, so that I can receive payment. | 1. Submission button is enabled only after verification. 2. Successful submission redirects to the Invoices Dashboard. 3. Invoice status is immediately updated to "Processing". |

### 7.2. Flow B: Bulk Invoice (Large Provider)

| Title | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| **Bulk Batch Upload** | As a Large Provider, I want to upload multiple invoices in a single file (CSV/Excel/PDF), so that I can process my weekly volume efficiently. | 1. Supports multi-record spreadsheets and multi-page PDFs. 2. System indicates upload progress and extraction status. 3. Total batch count and value are displayed after extraction. |
| **Intelligent Auto-Mapping** | As an Admin, I want the system to automatically recognize my file structure, so that I don't waste time on manual column mapping. | 1. System uses headers like "Inv", "Amount", "Description" to auto-map. 2. Successfully mapped records are moved directly to the staging table. 3. A confirmation summary shows which columns were identified. |
| **Mapping Last Resort** | As an Admin, I want to manually map columns if auto-detect fails, so that I can process non-standard report exports. | 1. Mapping interface appears only when auto-detection confidence is low. 2. User selects columns for Invoice #, Total, and Items from a dropdown. 3. System saves mapping preference for future files from the same provider. |
| **Bulk Staging Management** | As an Admin, I want to manage all extracted invoices in a grid, so that I can perform bulk edits or deletions. | 1. Staging table allows sorting and searching by Invoice #. 2. Inline editing is enabled for Amount and Description/Items. 3. Mass delete option is available for invalid rows. |
| **Segmented Batch Verification** | As an Admin, I want to verify the entire batch and see color-coded results, so that I can focus on resolving errors. | 1. "Verify All" button triggers batch API validation. 2. Green rows = Perfect match. 3. Yellow rows = Mismatching amount (displays Jireh's expected amount). 4. Red rows = Invoice # not found. |
| **Selective Bulk Submission** | As an Admin, I want to submit only the valid rows from a batch, so that my payments are not delayed by a few problematic invoices. | 1. "Submit Valid Rows" button is available. 2. Valid rows are submitted to API; invalid rows remain in the staging table for correction. 3. System provides a summary of successfully submitted vs. held invoices. |
| **Audit Detail Visibility** | As an Auditor, I want to see the specific items included in each bulk invoice, so that I can verify the legitimacy of the billing. | 1. Detailed "Items" column is present in the staging table. 2. Clicking an item list expands it to show full descriptions and unit prices (if available). 3. Item presence is a mandatory condition for "Green" status. |

### 7.3. Flow C: Disbursement (Admin)

| Title | Description | Acceptance Criteria |
|-------|-------------|---------------------|
| **Selective Disbursement** | As an Admin, I want to select specific settled invoices to disburse, so that I can control the timing and scope of each payout. | 1. Wallet tab displays all settled invoices as selectable line items with amounts. 2. Checkboxes allow individual or "Select All" selection. 3. Selected total is displayed before confirming. |
| **Single Preconfigured Payout Channel** | As an Admin, I want disbursements to route automatically through the preconfigured M-Pesa Paybill, so that I do not need to manage payment channels per transaction. | 1. No channel selection step is presented during disbursement. 2. The system routes all payouts through the single preconfigured M-Pesa Paybill and account number. 3. The configured Paybill details are visible in system settings but not selectable at disbursement time. |
| **Disbursement Confirmation Code** | As an Admin, I want to be required to type a system-generated code before a disbursement is processed, so that large payouts cannot be triggered by an accidental click. | 1. Clicking "Disburse" opens a confirmation step showing the invoice count, total amount, and a unique system-generated code (e.g., `DISB-7X4K`). 2. The "Confirm Disburse" button is disabled until the admin types the code exactly as shown. 3. A new code is generated for each disbursement attempt and is single-use. 4. Closing or cancelling the confirmation step discards the code and returns the admin to the Wallet. |
| **Disbursement Status Feedback** | As an Admin, I want real-time status updates during disbursement, so that I know whether the payout succeeded or failed. | 1. Selected invoices immediately show "Disbursing" status and become non-interactive once the confirmation code is accepted. 2. Successful payouts transition invoices to "Disbursed" and move them to the History tab with the M-Pesa reference number. 3. Failed payouts return invoices to the Wallet with a "Disbursement Failed" badge and a retry prompt. |
| **Disbursement Retry** | As an Admin, I want to retry a failed disbursement without re-selecting invoices, so that I can recover from transient errors quickly. | 1. "Retry" action is available on invoices marked "Disbursement Failed." 2. Retry resubmits through the same preconfigured M-Pesa Paybill. 3. Invoices remain in the Wallet and are fully interactable while in the failed state. |
| **Partial Batch Disbursement Failure** | As an Admin, I want individual invoice failures within a bulk disbursement to be isolated, so that successfully paid invoices are not affected. | 1. Invoices that transfer successfully move to "Disbursed" in the History tab. 2. Invoices that fail return individually to the Wallet with "Disbursement Failed" badges. 3. The admin can retry each failed invoice independently. |
| **Disbursement Audit Trail** | As a Finance Manager, I want to view the full list of invoices included in any historical payout, so that I can reconcile bank deposits with internal records. | 1. Each entry in the History tab is clickable and opens a detail view. 2. The detail view lists all invoices included in the payout with amounts and item breakdowns. 3. The M-Pesa confirmation reference number, initiating admin, and timestamp are recorded for every payout. |

---

## 8. Open Questions

1. **Who will transaction charges be charged to?**
   Transaction charges should be absorbed by Jireh because we already collect a discount from providers, and additional fees could create friction. To manage costs effectively, Jireh should provide a set number of free disbursements per month, such as 30. Any disbursements exceeding this monthly limit would then be charged to the provider and deducted directly from their wallet funds.

2. **What is the technical behavior for individual invoice failures within a bulk invoice submission?**
   In cases where a bulk file is used but certain rows are flagged (Red/Yellow), the system allows for a "Partial Submission." Successfully verified items transition to "Submitted" and move to the Wallet, while the original bulk file is uploaded and linked to those specific records for compliance. Flagged items remain persisted in the staging grid. The user can later correct these or upload a new file specifically for those records, triggering a secondary compliance upload and linking process upon successful submission.
