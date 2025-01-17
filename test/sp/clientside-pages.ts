import { expect } from "chai";
import { getRandomString, combine, stringIsNullOrEmpty } from "@pnp/core";
import "@pnp/sp/webs";
import "@pnp/sp/site-users";
import "@pnp/sp/clientside-pages";
import "@pnp/sp/comments/clientside-page";
import "@pnp/sp/files";
import { ClientsidePageFromFile, ClientsideText, CreateClientsidePage, ClientsideWebpart, IClientsidePage, PromotedState } from "@pnp/sp/clientside-pages";

describe("Clientside Pages", function () {

    let relUrl = "";

    before(function () {

        if (!this.pnp.settings.enableWebTests) {
            this.skip();
        }

        relUrl = "/" + this.pnp.settings.sp.testWebUrl.substring(this.pnp.settings.sp.testWebUrl.indexOf("/sites/"));
    });

    it("web.addClientSidePage", async function () {
        const pageName = `TestingAdd_${getRandomString(4)}.aspx`;
        const pageUrl = combine(relUrl, "SitePages", pageName);
        await this.pnp.sp.web.addClientsidePage(pageName);
        const page = await this.pnp.sp.web.getFileByServerRelativePath(pageUrl)();
        return expect(page.Name).to.equal(pageName);
    });

    it("CreateClientSidePage", function () {

        return expect(CreateClientsidePage(this.pnp.sp.web, `TestingAdd_${getRandomString(4)}.aspx`, "title")).to.eventually.be.fulfilled;
    });

    it("web.addClientSidePage - promoted state 1", async function () {
        const p = await this.pnp.sp.web.addClientsidePage(`TestingAdd_${getRandomString(4)}.aspx`, "A Title", "Article", PromotedState.PromoteOnPublish);
        return expect(p.save(true)).to.eventually.be.fulfilled;
    });

    it("CreateClientSidePage - promoted state 1", async function () {
        const p = await CreateClientsidePage(this.pnp.sp.web, `TestingAdd_${getRandomString(4)}.aspx`, "title", "Article", PromotedState.PromoteOnPublish);
        return expect(p.save(true)).to.eventually.be.fulfilled;
    });

    it("CreateClientSidePage - SingleWebPartAppPage", function () {

        const promise = CreateClientsidePage(this.pnp.sp.web, `TestingAdd_${getRandomString(4)}.aspx`, "SingleWebPartAppPage", "SingleWebPartAppPage");
        return expect(promise).to.eventually.be.fulfilled;
    });

    it("load", async function () {

        const pageFileName = `TestingLoad_${getRandomString(4)}.aspx`;

        await this.pnp.sp.web.addClientsidePage(pageFileName);

        // need to make the path relative
        const rel = this.pnp.settings.sp.testWebUrl.substr(this.pnp.settings.sp.testWebUrl.indexOf("/sites/"));
        const promise = ClientsidePageFromFile(this.pnp.sp.web.getFileByServerRelativePath(combine("/", rel, "SitePages", pageFileName)));
        return expect(promise).to.eventually.be.fulfilled;
    });

    describe("web.loadClientsidePage", async function () {

        let page: IClientsidePage;

        const pageName = `TestingloadClientsidePage_${getRandomString(4)}.aspx`;

        before(async function () {
            page = await this.pnp.sp.web.addClientsidePage(pageName);
            await page.save();
        });

        it("can load a page", async function () {

            const serverRelativePath = combine("/", this.pnp.settings.sp.testWebUrl.substr(this.pnp.settings.sp.testWebUrl.indexOf("/sites/")), "SitePages", pageName);

            page = await this.pnp.sp.web.loadClientsidePage(serverRelativePath);

            return expect(page).to.not.be.null.and.not.undefined;
        });
    });

    describe("promoteToNews", async function () {

        let page: IClientsidePage;

        const pageName = `TestingpromoteToNews_${getRandomString(4)}.aspx`;

        before(async function () {
            page = await this.pnp.sp.web.addClientsidePage(pageName);
            await page.save();
        });

        it("can promote a page", async function () {

            return expect(page.promoteToNews()).to.eventually.be.fulfilled.and.eq(true);
        });
    });

    it("web.getClientsideWebParts", function () {
        return expect(this.pnp.sp.web.getClientsideWebParts()).to.eventually.be.fulfilled;
    });

    describe("save", function () {

        it("Should update a pages content with a text control", function () {
            return this.pnp.sp.web.addClientsidePage(`TestingSave_${getRandomString(4)}.aspx`).then(page => {

                page.addSection().addControl(new ClientsideText("This is test text!!!"));

                return expect(page.save()).to.eventually.be.fulfilled;
            });
        });

        it("Should update a pages content with an embed control", function () {
            return this.pnp.sp.web.getClientsideWebParts().then(parts => {

                this.pnp.sp.web.addClientsidePage(`TestingSave_${getRandomString(4)}.aspx`).then(page => {

                    const part = ClientsideWebpart.fromComponentDef(parts.filter(c => c.Id === "490d7c76-1824-45b2-9de3-676421c997fa")[0]);

                    part.setProperties<{ embedCode: string }>({
                        embedCode: "https://www.youtube.com/watch?v=IWQFZ7Lx-rg",
                    });

                    page.addSection().addControl(part);

                    return expect(page.save()).to.eventually.be.fulfilled;
                });
            });
        });
    });

    describe("Page comments", function () {

        let page: IClientsidePage;

        before(async function () {
            page = await this.pnp.sp.web.addClientsidePage(`TestingCommentToggle_${getRandomString(4)}.aspx`);
        });

        it("Should disable", function () {
            return expect(page.disableComments()).to.eventually.be.fulfilled;
        });

        it("Should enable", function () {
            return expect(page.enableComments()).to.eventually.be.fulfilled;
        });
    });

    describe("Sections and Columns", function () {

        let page: IClientsidePage;

        this.beforeEach(async function () {
            page = await this.pnp.sp.web.addClientsidePage(`TestingSectionsAndColumns_${getRandomString(4)}.aspx`);
        });

        it("Default section, 2 empty columns", async function () {

            page.sections = [];
            await page.save();

            if (page.sections.length < 1) {
                page.addSection();
            }

            page.sections[0].addColumn(6);
            page.sections[0].addColumn(6);

            // save
            await page.save();

            // reload
            await page.load();

            expect(page.sections.length === 1);
            expect(page.sections[0].columns.length === 2);
            expect(page.sections[0].columns[0].factor === 6);
            expect(page.sections[0].columns[1].factor === 6);
        });

        it("vertical section", async function () {

            page.sections = [];
            await page.save();

            if (page.sections.length < 1) {
                page.addSection();
            }

            page.sections[0].addColumn(6);
            page.sections[0].addColumn(6);

            const vertSection = page.addVerticalSection();
            vertSection.addControl(new ClientsideText("Hello."));
            vertSection.addControl(new ClientsideText("I'm second."));

            // save
            await page.save();

            // reload
            await page.load();

            const webData = await this.pnp.sp.web.select("ServerRelativeUrl")();

            // we need a full reload
            page = await this.pnp.sp.web.loadClientsidePage(combine("/", webData.ServerRelativeUrl, (<any>page).json.Path.DecodedUrl));

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(page.hasVerticalSection).to.be.true;
            expect(page.verticalSection.columns[0].controls.length).to.eq(2);
            const ctrl = <ClientsideText>page.verticalSection.columns[0].controls[1];
            expect(ctrl.text).to.match(/I'm second\./);
        });

        it("vertical section 2", async function () {

            page.addVerticalSection();
            page.verticalSection.addControl(new ClientsideText("Hello."));
            page.verticalSection.addControl(new ClientsideText("I'm second."));

            // save
            await page.save();
            // load to update the data with correct url
            await page.load();

            const webData = await this.pnp.sp.web.select("ServerRelativeUrl")();

            // we need a full reload
            page = await this.pnp.sp.web.loadClientsidePage(combine("/", webData.ServerRelativeUrl, (<any>page).json.Path.DecodedUrl));

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(page.hasVerticalSection).to.be.true;
            expect(page.verticalSection.columns[0].controls.length).to.eq(2);
            const ctrl = <ClientsideText>page.verticalSection.columns[0].controls[1];
            expect(ctrl.text).to.match(/I'm second\./);
        });
    });

    describe("like and unlike", function () {

        let page: IClientsidePage;

        before(async function () {
            page = await this.pnp.sp.web.addClientsidePage(`TestingLikeUnlike_${getRandomString(4)}.aspx`);
        });

        it("like()", function () {
            return expect(page.like()).to.eventually.be.fulfilled;
        });

        it("unlike()", function () {
            return expect(page.unlike()).to.eventually.be.fulfilled;
        });

        it("getLikedByInformation", function () {
            return expect(page.getLikedByInformation()).to.eventually.be.fulfilled;
        });
    });

    describe("author", function () {

        let page: IClientsidePage;
        let userId: number;
        let userPrincipalName: string;
        let pageUrl: string;

        before(async function () {

            if (stringIsNullOrEmpty(this.pnp.settings.testUser)) {
                this.skip();
            }

            page = await this.pnp.sp.web.addClientsidePage(`TestingSettingAuthor_${getRandomString(4)}.aspx`);
            await page.save();
            // we need the updated url info from the published page so we re-load things.
            await page.load();

            const serverRelUrl = (await this.pnp.sp.web.select("ServerRelativeUrl")()).ServerRelativeUrl;
            pageUrl = combine("/", serverRelUrl, (<any>page).json.Url);

            const ensureTestUser = await this.pnp.sp.web.ensureUser(this.pnp.settings.testUser);
            userId = ensureTestUser.data.Id;
            userPrincipalName = ensureTestUser.data.Email;
        });

        it("setAuthorById()", async function () {

            await page.setAuthorById(userId);
            await page.save();

            const page2 = await this.pnp.sp.web.loadClientsidePage(pageUrl);
            expect(page2.authorByLine).to.eq(userPrincipalName);
        });

        it("setAuthorByLoginName()", async function () {
            await page.setAuthorByLoginName(this.pnp.settings.testUser);
            await page.save();

            const page2 = await this.pnp.sp.web.loadClientsidePage(pageUrl);

            expect(page2.authorByLine).to.eq(userPrincipalName);
        });
    });

    describe("description", function () {

        let page: IClientsidePage;
        let pageUrl: string;

        before(async function () {

            page = await this.pnp.sp.web.addClientsidePage(`TestingSettingDescription_${getRandomString(4)}.aspx`);
            await page.save();
            // we need the updated url info from the published page so we re-load things.
            await page.load();

            const serverRelUrl = (await this.pnp.sp.web.select("ServerRelativeUrl")()).ServerRelativeUrl;
            pageUrl = combine("/", serverRelUrl, (<any>page).json.Url);
        });

        it("set", async function () {

            const description = `Test Desc ${getRandomString(10)}`;
            page.description = description;
            await page.save();

            const page2 = await this.pnp.sp.web.loadClientsidePage(pageUrl);

            expect(page2.description).to.eq(description);
        });
    });
});
