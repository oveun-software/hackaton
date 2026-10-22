-- Synthetic TalentLens demo only. No real CVs and no model outputs.
-- Run once on your own instance, one statement at a time.
-- These names belong to this sample; no existing objects are dropped.
CREATE LIGHTNING DATABASE TALENTLENS_FILES DESCRIBE BY "TalentLens synthetic recruitment sources";

CREATE LIGHTNING FILESTORE TABLE profiles FROM TALENTLENS_FILES FORMAT CSV OPTIONS (
  PATH "file:///home/zetaris/customer-data/shared/talentlens/profiles.csv",
  inferSchema "true",
  header "true"
);

CREATE LIGHTNING FILESTORE TABLE documents FROM TALENTLENS_FILES FORMAT CSV OPTIONS (
  PATH "file:///home/zetaris/customer-data/shared/talentlens/documents.csv",
  inferSchema "true",
  header "true"
);

CREATE SCHEMASTORE CONTAINER talentlens;

CREATE SCHEMASTORE VIEW candidates WITH CONTAINER talentlens AS
SELECT p.candidate_id, p.display_name, d.document_name, d.cv_text
FROM TALENTLENS_FILES.profiles p
JOIN TALENTLENS_FILES.documents d ON p.candidate_id = d.candidate_id;
