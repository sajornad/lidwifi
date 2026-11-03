/**
 * LidWiFi — Google Form to Email Automation (Google Apps Script)
 * Form ID: 1WuohqGZDQYZS54f2T4_QXhnxiaFP4Ah_RtCpGOZPhHE
 *
 * HOW TO ACTIVATE (Takes 30 seconds):
 * 1. Open your Google Form: https://docs.google.com/forms/d/1WuohqGZDQYZS54f2T4_QXhnxiaFP4Ah_RtCpGOZPhHE/edit
 * 2. Click the three dots (⋮) in the top right -> "Script editor" (or Extensions -> Apps Script).
 * 3. Paste this entire file and click "Save" (💾).
 * 4. Select "setupLidWiFiAutomation" in the top toolbar dropdown and click "Run" (▶️).
 * 5. Approve permissions once. Done! Every form submission will now automatically email the LidWiFi.dmg link.
 */

const FORM_ID = '1WuohqGZDQYZS54f2T4_QXhnxiaFP4Ah_RtCpGOZPhHE';

// Direct GitHub Release download URL for LidWiFi.dmg
const DMG_DOWNLOAD_URL = 'https://github.com/sajornad/lidwifi/releases/latest/download/LidWiFi.dmg';

/**
 * Run this function ONCE from the Apps Script editor to install the automatic trigger.
 */
function setupLidWiFiAutomation() {
  const form = FormApp.openById(FORM_ID);
  form.setAcceptingResponses(true);

  // Remove existing duplicate triggers if re-running setup
  const triggers = ScriptApp.getUserTriggers(form);
  triggers.forEach((t) => {
    if (t.getHandlerFunction() === 'onLidWiFiFormSubmit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('onLidWiFiFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log('✓ LidWiFi email automation trigger installed successfully for Form: ' + form.getTitle());
}

/**
 * Safely escapes untrusted user input before interpolating into an HTML email body
 * and strips URLs/control characters to prevent HTML injection or phishing relay abuse.
 */
function sanitizeNameForEmail(raw) {
  const cleaned = String(raw || '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[\r\n\t<>]/g, ' ')
    .trim()
    .slice(0, 60);
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Triggered automatically every time a user submits the Google Form.
 */
function onLidWiFiFormSubmit(e) {
  if (!e || !e.response) return;

  const response = e.response;
  let recipientEmail = response.getRespondentEmail();

  // Scan form items by explicit question title only (never guess email from arbitrary free-text fields)
  const itemResponses = response.getItemResponses();
  const answers = {};
  itemResponses.forEach((ir) => {
    const title = ir.getItem().getTitle();
    const val = String(ir.getResponse() || '').trim();
    answers[title] = val;
    if (!recipientEmail && title === 'What is your email address?') {
      recipientEmail = val;
    }
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!recipientEmail || !emailRegex.test(recipientEmail) || recipientEmail.length > 254) {
    Logger.log('Invalid or missing email address in submission.');
    return;
  }

  const safeName = sanitizeNameForEmail(answers['What is your full name?']);
  const greeting = safeName ? `Hi ${safeName},` : 'Hi,';
  const subject = 'Your LidWiFi.dmg download link for macOS';

  const htmlBody = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif; font-size:16px; line-height:1.6; color:#111315; max-width:560px;">
      <p>${greeting}</p>
      <p>
        Here you can download the <strong>.DMG application</strong>:
        <br>
        <a href="${DMG_DOWNLOAD_URL}" style="color:#196EFF; font-weight:700;">Download LidWiFi.dmg</a>
      </p>
      <p>
        Just double-click it and you will see a small laptop on your menu bar. It will turn off your Wi‑Fi as soon as you close the lid.
      </p>
      <p>
        Best,<br><br>
        <strong>Daniel Rojas Roa</strong>
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: recipientEmail,
    subject: subject,
    htmlBody: htmlBody
  });

  Logger.log('Sent LidWiFi download link (recipient redacted for log privacy).');
}

