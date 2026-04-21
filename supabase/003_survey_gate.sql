-- Adds the Pre-Service Survey completion gate.
--
-- Packet 1 (intake documents) is hidden in the client portal until this
-- timestamp is populated. Populated by POST /api/webhooks/survey-complete
-- when Google Apps Script on the Pre-Service Survey form fires onFormSubmit.

ALTER TABLE onboarding_clients
  ADD COLUMN IF NOT EXISTS survey_completed_at timestamptz;

COMMENT ON COLUMN onboarding_clients.survey_completed_at IS
  'When the client submitted the Pre-Service Survey. Packet 1 is gated until non-null.';

CREATE INDEX IF NOT EXISTS onboarding_clients_survey_completed_at_idx
  ON onboarding_clients (survey_completed_at)
  WHERE survey_completed_at IS NULL;
