import { test } from '../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ApisMailInbox } from '../src/apis/ApisMailInbox';
import { ContactPage } from '../src/pages/ContactPage';
import { loadTestData } from '../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../src/utils/UniqueData';

let contactPage: ContactPage;

let testData: typeof import('../resources/testData/ContactTestJsonFile.json');

/** The contact form as a guest sees it. The subject texts are the ones the story's AC3 lists (test plan §4.1). */
test.describe('Contact form', () => {

  test('Subject dropdown lists the six documented options', { tag: ['@regression'] }, async () => {
    await allure.feature('Contact form');
    await allure.testCaseId('TC-CONT-3');

    await contactPage.navigate();
    await contactPage.verifySubjectOptions(testData.tcCONT3.expectedSubjects);
  });

  test('Valid submission confirms and sends the email', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Contact form');
    await allure.testCaseId('TC-CONT-8');
    const contact = withUniqueEmail(testData.tcCONT8.contact, newUuid());

    await contactPage.navigate();
    await contactPage.sendMessage(contact);
    await contactPage.verifyConfirmation(testData.tcCONT8.expectedConfirmation);
    // Only the local stack has an inbox, so outside it the confirmation above still gets checked.
    const apisMailInbox = new ApisMailInbox(request);
    await apisMailInbox.verifyMailDelivered(contact.email, testData.tcCONT8.expectedMailSubject);
  });

  test('Subject dropdown shows no Error 101 or Error 202 entries', { tag: ['@regression'] }, async () => {
    await allure.feature('Contact form');
    await allure.testCaseId('TC-CONT-9');

    await contactPage.navigate();
    await contactPage.verifySubjectOptionNotListed(testData.tcCONT9.error101Subject);
    await contactPage.verifySubjectOptionNotListed(testData.tcCONT9.error202Subject);
  });

  test.beforeAll(async () => {
    testData = loadTestData('ContactTestJsonFile.json');
  });

  test.beforeEach(({ page }) => {
    contactPage = new ContactPage(page);
  });

});
