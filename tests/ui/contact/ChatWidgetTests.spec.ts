import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { ChatWidgetPage } from '../../../src/pages/ChatWidgetPage';
import { HeaderPage } from '../../../src/pages/HeaderPage';
import { ProductDetailPage } from '../../../src/pages/ProductDetailPage';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail, withUuid } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;
let apisUserAccount: ApisUserAccount;
let chatWidgetPage: ChatWidgetPage;
let headerPage: HeaderPage;
let productDetailPage: ProductDetailPage;

let testData: typeof import('../../../resources/testData/ChatWidgetTestJsonFile.json');

/**
 * Chat checkout (story AC4). A visitor who is not signed in either signs in from the chat or continues as a guest,
 * so TC-CHAT-6 has one test per route. Each test seeds its own product and account through the API, left behind on
 * purpose. Each question is checked before it is answered: the chat takes any input at any time, and an answer sent
 * too early would count as the password. Never retried: this target locks an account after ONE failed login (known
 * defect #21).
 */
test.describe('Chat widget', () => {
  test.describe.configure({ retries: 0 });

  test('Chat checkout walks a customer who signs in through cart, address, payment and confirmation', { tag: ['@smoke'] }, async () => {
    await allure.feature('Chat widget');
    await allure.testCaseId('TC-CHAT-6a');
    const data = testData.tcCHAT6SignIn;
    const { prompts, address } = data;
    const uuid = newUuid();
    const customer = withUniqueEmail(data.customer, uuid);

    await apisUserAccount.registerUser(customer);
    const catalog = await apisProductCatalog.seedCatalog(uuid, data);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(data.cartItemCount);

    await chatWidgetPage.open();
    await chatWidgetPage.startCheckout();
    await chatWidgetPage.verifyMessage(data.expectedCartTotal);
    await chatWidgetPage.signIn(customer.email, customer.password);
    await chatWidgetPage.verifyMessage(data.expectedSignedIn);
    await chatWidgetPage.verifyMessage(prompts.street);
    await chatWidgetPage.answer(address.street);
    await chatWidgetPage.verifyMessage(prompts.city);
    await chatWidgetPage.answer(address.city);
    await chatWidgetPage.verifyMessage(prompts.state);
    await chatWidgetPage.answer(address.state);
    await chatWidgetPage.verifyMessage(prompts.country);
    await chatWidgetPage.answer(address.country);
    await chatWidgetPage.verifyMessage(prompts.postcode);
    await chatWidgetPage.answer(address.postcode);
    await chatWidgetPage.verifyAddressConfirmation(data.addressHeading, data.expectedAddressLines);
    await chatWidgetPage.confirmAddress();
    await chatWidgetPage.verifyMessage(prompts.paymentMethod);
    await chatWidgetPage.choosePaymentMethod(data.paymentMethod);
    await chatWidgetPage.verifyMessage(prompts.accountName);
    await chatWidgetPage.answer(data.accountName);
    await chatWidgetPage.verifyMessage(prompts.accountNumber);
    await chatWidgetPage.answer(data.accountNumber);
    await chatWidgetPage.verifyOrderSummary(data.summaryHeading, data.expectedSummaryLines);
    await chatWidgetPage.placeOrder();
    await chatWidgetPage.verifyMessage(data.expectedSuccess);
    await chatWidgetPage.verifyOrderNumberShown();
  });

  test('Chat checkout asks a guest for email, first name and last name before the address', { tag: ['@regression'] }, async () => {
    await allure.feature('Chat widget');
    await allure.testCaseId('TC-CHAT-6b');
    const data = testData.tcCHAT6Guest;
    const uuid = newUuid();

    const catalog = await apisProductCatalog.seedCatalog(uuid, data);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(data.cartItemCount);

    await chatWidgetPage.open();
    await chatWidgetPage.startCheckout();
    await chatWidgetPage.verifyMessage(data.expectedCartTotal);
    await chatWidgetPage.verifyGuestCheckoutOffered();
    await chatWidgetPage.continueAsGuest();
    await chatWidgetPage.verifyMessage(data.expectedEmailPrompt);
    await chatWidgetPage.answer(withUuid(data.email, uuid));
    await chatWidgetPage.verifyMessage(data.expectedFirstNamePrompt);
    await chatWidgetPage.answer(data.firstName);
    await chatWidgetPage.verifyMessage(data.expectedLastNamePrompt);
    await chatWidgetPage.answer(data.lastName);
    await chatWidgetPage.verifyMessage(data.expectedStreetPrompt);
  });

  test.beforeAll(async () => {
    testData = loadTestData('ChatWidgetTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
    apisUserAccount = new ApisUserAccount(request);
    chatWidgetPage = new ChatWidgetPage(page);
    headerPage = new HeaderPage(page);
    productDetailPage = new ProductDetailPage(page);
  });

});
