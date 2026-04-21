You are building a ServiceNow scoped application called "Catalog Item Configurator"
(scope: x_cat_item_cfg or similar). This app replaces an Excel-based intake process
and serves as the single source of truth for describing new Service Catalog items
before they are built by developers. Prioritize minimal agent calls — implement
everything completely in one pass where possible.

---

## APPLICATION OVERVIEW

**Purpose:** Allow business users to describe new catalog items (variables, tasks,
integrations) in a structured, versioned, approval-enabled application. Developers
consume this data to build catalog items, workflows, and integrations. Once approved,
the application can generate real ServiceNow catalog artifacts directly.

**Key non-functional requirements:**
- Full audit trail and versioning (leverage ServiceNow update sets / journal fields)
- Approval workflow for catalog item descriptors
- Collaboration via work notes, comments, and Connect sidebar
- Role-based access: Business Users (create/edit descriptors) vs. Developers (read,
  trigger artifact generation) vs. Approvers
- All free-text fields must exist in BOTH English (field suffix _en) AND German
  (field suffix _de) — displayed side-by-side in the custom UI
- Cloning: ability to clone a full Catalog Item Descriptor (including all related
  Variable and Task Descriptor records) to create a new version

---

## TABLE DEFINITIONS

### 1. Catalog Item Descriptor [x_cat_item_cfg_item_descriptor]
Extends: Task (to inherit approval, work notes, journal, state, assignment)

Fields:
- name [string, 100] — short technical name
- display_name_en [string, 200] — Display name (English)
- display_name_de [string, 200] — Display name (German)
- short_description_en [string, 400] — Short description (English)
- short_description_de [string, 400] — Short description (German)
- long_description_en [html/large string] — Detailed description (English)
- long_description_de [html/large string] — Detailed description (German)
- category [reference → sc_category] — Catalog category
- service_owner [reference → sys_user] — Business owner
- version [string, 20] — e.g. "1.0", "2.3"
- state [choice: Draft, In Review, Approved, Rejected, Archived]
- image_primary [image / attachment field] — Primary catalog item image
- image_thumbnail [image / attachment field] — Thumbnail image
- notes_en [large string] — Additional notes (English)
- notes_de [large string] — Additional notes (German)
- approval [approval field inherited from Task]
- generated_catalog_item [reference → sc_cat_item] — Reference to the OOTB
  Catalog Item generated from this descriptor (populated after artifact generation;
  read-only for all roles except admin)

### 2. Catalog Variable Descriptor [x_cat_item_cfg_variable_descriptor]
Parent: Reference to Catalog Item Descriptor (mandatory, cascade delete)

Fields:
- catalog_item [reference → x_cat_item_cfg_item_descriptor, mandatory]
- order [integer] — Display order
- variable_type [choice: Single Line Text, Multi Line Text, Select Box, Checkbox,
  Date, Reference, Attachment, Container Start, Container End, Break]
- label_en [string, 200] — Variable label (English)
- label_de [string, 200] — Variable label (German)
- hint_en [string, 400] — Hint/tooltip (English)
- hint_de [string, 400] — Hint/tooltip (German)
- mandatory [boolean]
- default_value_en [string, 200] — Default value (English)
- default_value_de [string, 200] — Default value (German)
- reference_table [string, 100] — If type=Reference, target table name
- choice_values_en [large string] — Pipe-separated choices (English)
- choice_values_de [large string] — Pipe-separated choices (German)
- visible_condition [string, 400] — UI condition / dependent field logic description
- notes_en [string, 400] — Developer notes (English)
- notes_de [string, 400] — Developer notes (German)

### 3. Catalog Task Descriptor [x_cat_item_cfg_task_descriptor]
Parent: Reference to Catalog Item Descriptor (mandatory, cascade delete)

Fields:
- catalog_item [reference → x_cat_item_cfg_item_descriptor, mandatory]
- order [integer] — Execution order
- task_type [choice: User Task, Email, Integration Task, Process Step]
- name_en [string, 200] — Task name (English)
- name_de [string, 200] — Task name (German)

  // Visible for ALL types:
  - stage [string, 100] — Logical stage/phase name

  // USER TASK (visible only when task_type = User Task):
  - ut_summary_en [string, 400] — Summary (English)
  - ut_summary_de [string, 400] — Summary (German)
  - ut_description_en [html/large string] — Instructions for fulfiller (English)
  - ut_description_de [html/large string] — Instructions for fulfiller (German)

  // EMAIL (visible only when task_type = Email):
  - email_subject_en [string, 400] — Subject (English)
  - email_subject_de [string, 400] — Subject (German)
  - email_body_en [html/large string] — Body (English)
  - email_body_de [html/large string] — Body (German)
  - email_audience_en [string, 400] — Audience description (English)
  - email_audience_de [string, 400] — Audience description (German)
  - email_sender [string, 200] — Sender address or role

  // INTEGRATION TASK (visible only when task_type = Integration Task):
  - int_system_name [string, 200] — Target system / integration name
  - int_direction [choice: Inbound, Outbound, Bidirectional]
  - int_protocol [choice: REST, SOAP, JDBC, File, Other]
  - int_description_en [html/large string] — Integration description (English only)
  - int_field_mapping_en [large string] — Field mapping description (English only)
  - int_error_handling_en [string, 400] — Error handling notes (English only)

  // PROCESS STEP (visible only when task_type = Process Step):
  - ps_description_en [html/large string] — Flow step description (English only)
  - ps_inputs_en [string, 400] — Expected inputs (English only)
  - ps_outputs_en [string, 400] — Expected outputs (English only)
  - ps_conditions_en [string, 400] — Branching conditions (English only)

---

## ROLE DEFINITIONS

Create the following roles:
- x_cat_item_cfg.business_user — Can create and edit own Catalog Item Descriptors
- x_cat_item_cfg.developer — Read-only on all records; can trigger artifact generation
- x_cat_item_cfg.approver — Can approve/reject Catalog Item Descriptors
- x_cat_item_cfg.admin — Full access

---

## CUSTOM UI — REACT-BASED NOW EXPERIENCE PAGE

Build the business-user UI as a React component registered as a Now Experience
UI Framework custom component (using the ServiceNow CLI / Now Experience tooling
pattern the Build Agent supports). The component is deployed as a UI Page or
embedded macro accessible from the application navigator. Do NOT use the Core UI
form renderer for business user interactions.

### Technology Stack
- React 17+ functional components with hooks (useState, useEffect, useCallback,
  useRef)
- ServiceNow REST Table API (scoped: /api/now/table/...) for all data reads and
  writes — use XMLHttpRequest or fetch with the CSRF token from the page context
- @servicenow/now-ui-components (Seismic design system) for all UI primitives:
  now-button, now-input, now-textarea, now-select, now-modal, now-tabs,
  now-badge, now-toast, now-icon, now-tooltip — use these instead of raw HTML
  form controls wherever available
- Inline CSS modules or scoped <style> blocks for layout; follow the Seismic
  spacing scale (4px base unit) and color tokens

### Application Shell

Render a top-level <CatalogConfigurator /> root component that contains:
- A sticky application header bar with the app name, the current user's avatar,
  and a light/dark mode toggle
- Route-level state managed via a simple in-component router (no external router
  library): currentView = 'dashboard' | 'editor'
- A global toast notification region for success/error feedback

---

### View 1 — Dashboard

Renders when currentView = 'dashboard'.

**Layout:**
- Page title "Catalog Item Configurator" + "New Descriptor" primary button
  (now-button, variant="primary") top right
- Filter bar below title: state filter (now-select, options = all states),
  "My Items" toggle (now-button, variant="secondary"), free-text search input
- Responsive card grid (CSS grid, min 320px per card, auto-fill)

**Descriptor Card:**
Each card displays:
- display_name_en (heading)
- version badge (now-badge)
- state pill (now-badge, color-coded: Draft=neutral, In Review=info,
  Approved=positive, Rejected=critical, Archived=secondary)
- short_description_en (truncated to 2 lines)
- service_owner display name
- sys_updated_on formatted as relative time ("2 hours ago")
- Three-dot action menu (now-button, variant="tertiary", icon="more-horizontal-fill")
  with actions: Open, Clone, Archive

**Behavior:**
- On mount: fetch all x_cat_item_cfg_item_descriptor records the current user has
  read access to; display skeleton loader (animated placeholder cards) while loading
- Filtering and search applied client-side against the fetched dataset
- "New Descriptor" opens the Editor in create mode (blank form, state=Draft)
- "Open" navigates to the Editor in edit mode for the selected record
- "Clone" triggers a confirmation modal (now-modal) asking for the new version
  number, then calls the CatalogArtifactGenerator.cloneDescriptor Script Include
  via a scoped REST Scripted API endpoint, then refreshes the dashboard
- "Archive" triggers a confirmation modal, then PATCHes state=Archived

---

### View 2 — Descriptor Editor

Renders when currentView = 'editor', receiving descriptorSysId (null for create).

**Sticky Editor Header (always visible while scrolling):**
- Back arrow to Dashboard (with unsaved-changes guard)
- display_name_en as editable inline title (now-input, variant="borderless")
- Version badge + state pill
- If generated_catalog_item is populated: a read-only reference chip linking to
  the generated sc_cat_item record ("Catalog Item: [name]")
- Action buttons right-aligned:
  - "Save Draft" (now-button, variant="secondary") — always visible when state=Draft
  - "Submit for Approval" (now-button, variant="primary") — visible when state=Draft
  - "Generate Catalog Item" (now-button, variant="primary", icon="cog-fill") —
    visible when state=Approved AND generated_catalog_item is empty AND current
    user has role developer or admin
  - "Regenerate" (now-button, variant="secondary", icon="refresh-fill") —
    visible when state=Approved AND generated_catalog_item is populated AND
    current user has role developer or admin

**Tab Navigation (now-tabs):**

#### Tab 1 — General
- Two-column grid layout (left column = English fields, right column = German fields)
- Paired field rows (EN left, DE right) for:
  - display_name (now-input)
  - short_description (now-textarea, 2 rows)
  - long_description (now-textarea, 6 rows or rich text editor if available)
  - notes (now-textarea, 3 rows)
- Single-column fields below the bilingual grid:
  - category (now-select, options loaded from sc_category via REST)
  - service_owner (reference lookup input — now-input with typeahead against
    sys_user, storing sys_id)
  - version (now-input)
  - image_primary and image_thumbnail (file input with preview thumbnail)
- State and generated_catalog_item rendered as read-only info row at the bottom

#### Tab 2 — Variables
- Toolbar: "Add Variable" button (now-button, variant="secondary")
- Drag-and-drop sortable list of variable rows (implement with HTML5 draggable API
  or a lightweight built-in approach; on drop, recalculate and PATCH order fields
  for all affected records)
- Each variable row (collapsed):
  - Drag handle icon, order number, label_en, variable_type badge, mandatory
    indicator, expand chevron, delete button
- Each variable row (expanded inline panel):
  - Two-column grid for bilingual fields (label_en / label_de, hint_en / hint_de,
    default_value_en / default_value_de, choice_values_en / choice_values_de,
    notes_en / notes_de)
  - Single-column fields: variable_type (now-select), mandatory (now-toggle),
    visible_condition, reference_table
  - Conditional field visibility driven by variable_type selection (client-side):
    - reference_table: only when type = Reference
    - choice_values_en / choice_values_de: only when type = Select Box
    - default_value fields: hidden for Container Start, Container End, Break
  - "Save" and "Cancel" buttons within the expanded panel; Save PATCHes or POSTs
    the variable record via REST

#### Tab 3 — Tasks
- Toolbar: "Add Task" button (now-button, variant="secondary")
- Drag-and-drop sortable list of task cards (same drag approach as Tab 2)
- Each task card (collapsed):
  - Drag handle, order number, name_en, task_type badge (color-coded:
    User Task=info, Email=warning, Integration Task=purple, Process Step=positive),
    stage label, expand chevron, delete button
- Each task card (expanded inline panel):
  - Common fields (always visible): task_type (now-select), stage, name_en,
    name_de (side-by-side)
  - Conditional field groups shown/hidden based on task_type selection:

    USER TASK group (two-column EN/DE):
    - ut_summary_en / ut_summary_de (now-textarea, 2 rows)
    - ut_description_en / ut_description_de (now-textarea, 4 rows)

    EMAIL group (two-column EN/DE):
    - email_subject_en / email_subject_de (now-input)
    - email_body_en / email_body_de (now-textarea, 6 rows)
    - email_audience_en / email_audience_de (now-textarea, 2 rows)
    - email_sender (now-input, single column)

    INTEGRATION TASK group (single column, English only):
    - int_system_name, int_direction (now-select), int_protocol (now-select)
    - int_description_en (now-textarea, 4 rows)
    - int_field_mapping_en (now-textarea, 4 rows)
    - int_error_handling_en (now-textarea, 2 rows)

    PROCESS STEP group (single column, English only):
    - ps_description_en (now-textarea, 4 rows)
    - ps_inputs_en, ps_outputs_en, ps_conditions_en (now-textarea, 2 rows each)

  - "Save" and "Cancel" buttons within the expanded panel

#### Tab 4 — Preview
- Read-only simulation of the catalog item as an end user would see it
- Toggle button (now-button, variant="tertiary"): "Show English" / "Show German"
  switches all preview text between _en and _de field values
- Renders: display name, short description, thumbnail image, long description,
  and a static variable form mockup (each variable shown as a labeled read-only
  field matching its type)
- Task list rendered as a numbered process flow (stage label + task name + type
  badge)

#### Tab 5 — Activity
- Embedded journal stream: fetch journal entries (sys_journal_field) for the
  descriptor sys_id ordered by sys_created_on descending
- Render each entry as a timeline item: user avatar, name, timestamp, message
- "Add Work Note" and "Add Comment" input areas at the top (now-textarea +
  now-button); on submit POST to sys_journal_field via REST

### Editor Behavior
- On mount (edit mode): parallel REST fetches for descriptor record, related
  variables, related tasks, and journal entries; show skeleton loaders per tab
  while loading
- Auto-save on field blur for all General tab fields (PATCH descriptor record)
- Unsaved changes in expanded variable/task panels are tracked per-panel; 
  navigating away from the editor with unsaved panel changes shows a
  now-modal confirmation
- All inputs disabled (read-only styling, no save buttons) when
  state = Approved or Archived; a now-banner at the top explains the lock
- "Submit for Approval": PATCH state to "In Review", show success toast, lock fields
- Toast notifications (now-toast) for all async operation outcomes (save, submit,
  generate, clone, error)

---

## SCRIPTED REST API ENDPOINTS

Create the following Scripted REST API resource (x_cat_item_cfg_api, version v1)
to support React component calls that cannot go directly through the Table API:

### POST /x_cat_item_cfg_api/v1/clone
Request body: { "descriptorSysId": "...", "newVersion": "..." }
Calls CatalogArtifactGenerator.cloneDescriptor(); returns new descriptor sys_id.
Required role: x_cat_item_cfg.business_user

### POST /x_cat_item_cfg_api/v1/generate
Request body: { "descriptorSysId": "..." }
Calls CatalogArtifactGenerator.generateFromDescriptor(); returns generated
sc_cat_item sys_id or error.
Required role: x_cat_item_cfg.developer OR x_cat_item_cfg.admin

### POST /x_cat_item_cfg_api/v1/regenerate
Request body: { "descriptorSysId": "..." }
Deletes all item_option_new records linked to the existing sc_cat_item, then calls
generateFromDescriptor() again. Returns updated sc_cat_item sys_id or error.
Required role: x_cat_item_cfg.developer OR x_cat_item_cfg.admin

---

## CORE UI (For Developers & Admins)

1. Fully configured list views for all three tables with relevant columns
2. Form layouts for all three tables with all fields; UI policies implement
   conditional field visibility on Catalog Task Descriptor based on task_type
3. Related lists on Catalog Item Descriptor form: Variables (sorted by order),
   Tasks (sorted by order)
4. Approval engine configuration on Catalog Item Descriptor
5. Activity stream / journal enabled on Catalog Item Descriptor
6. UI Action "Clone Descriptor" on the Catalog Item Descriptor form (same
   Script Include as React UI; prompts for new version number via
   GlideDialogWindow)

---

## APPROVAL WORKFLOW

Create a Flow Designer flow on Catalog Item Descriptor:
- Trigger: Record updated → state changes to "In Review"
- Action: Request approval from group [x_cat_item_cfg.approver]
- On Approve: Set state = "Approved", send email notification to service_owner
- On Reject: Set state = "Rejected", write rejection reason to work notes,
  send email notification to service_owner

---

## SCRIPT INCLUDE: CatalogArtifactGenerator

Create Script Include x_cat_item_cfg.CatalogArtifactGenerator (server-side,
accessible from Scripted REST and UI Actions) with two methods:

### generateFromDescriptor(descriptorSysId)
Executes in a single transaction:
1. Read the Catalog Item Descriptor record
2. Create sc_cat_item: name = display_name_en, short_description =
   short_description_en, description = long_description_en,
   category = category (sys_id), picture = image_primary
3. For each Catalog Variable Descriptor ordered by order field, create
   item_option_new: cat_item = new sc_cat_item sys_id, name = label_en,
   question_type mapped from variable_type (mapping table below),
   instructions = hint_en, mandatory = mandatory,
   default_value = default_value_en, order = order,
   for Select Box: create item_option_new_set + item_option entries from
   choice_values_en split by pipe delimiter,
   for Reference: set reference = reference_table value
4. Write new sc_cat_item sys_id to generated_catalog_item on the descriptor
5. Return { success: true, catalogItemSysId: '...' } or { success: false,
   error: '...' }

variable_type → question_type mapping:
- Single Line Text → single_line_text
- Multi Line Text → multi_line_text
- Select Box → select_box
- Checkbox → checkbox
- Date → date
- Reference → reference
- Attachment → attachment
- Container Start → container_start
- Container End → container_end
- Break → break

### cloneDescriptor(descriptorSysId, newVersion)
1. Read source descriptor; copy all fields to a new record; set state = "Draft",
   version = newVersion, generated_catalog_item = null, opened_at = now,
   sys_created_by = current user
2. For each Catalog Variable Descriptor linked to the source, insert a copy
   with catalog_item pointing to the new descriptor sys_id
3. For each Catalog Task Descriptor linked to the source, insert a copy
   with catalog_item pointing to the new descriptor sys_id
4. Return { success: true, newDescriptorSysId: '...' } or
   { success: false, error: '...' }

---

## IMPLEMENTATION NOTES

- All tables: set appropriate ACLs per role definitions above
- Enable field-level auditing on all EN/DE text fields of Catalog Item Descriptor
- Provide demo/seed data: 1 sample Catalog Item Descriptor (state=Approved) with
  3 variables (Single Line Text, Select Box, Checkbox) and one of each task type,
  so artifact generation can be tested immediately
- Application navigator menu with modules: My Descriptors, All Descriptors,
  Pending Approvals, Variables, Tasks, Administration
- The React UI entry point is registered as a UI Macro or UI Page named
  x_cat_item_cfg_configurator; the application navigator "My Descriptors" and
  "All Descriptors" modules point to this page
