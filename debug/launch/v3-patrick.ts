import { ITestingSettings } from "../../test/settings.js";
import { ConsoleListener, Logger, LogLevel } from "@pnp/logging";
import { Queryable2, InjectHeaders, Caching, HttpRequestError, PnPLogging, get } from "@pnp/queryable";
import { NodeFetchWithRetry, MSAL, Proxy, NodeFetch } from "@pnp/nodejs";
import { combine, isFunc, getHashCode, PnPClientStorage, dateAdd, isUrlAbsolute, extend, extendable } from "@pnp/core";
import { DefaultParse, JSONParse, TextParse } from "@pnp/queryable";
import { ISharePointQueryable, sp2, _SharePointQueryable } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/features";

declare var process: { exit(code?: number): void };

function TestInitBehavior(): (instance: Queryable2) => Queryable2 {

    return (instance: Queryable2) => {

        // instance.on.init(function (this: Queryable2) {

        //     const o = extend(this, {

        //         async execute(): Promise<any> {
        //             console.log("HA HA");
        //         },
        //     });

        //     return o;
        // });

        instance.on.dispose(function (this: Queryable2) {

            // TODO:: Need a way to remove extentions

           this.log("I am in dispose.", 1);

           return this;
        });

        instance.on.pre(async function (url, init, result) {

            this.log("PRE FROM TestInitBehavior", LogLevel.Warning);                        

            return [url, init, result];
        });

        instance.on.post.prepend(async function (url, result) {
            
            this.log("POST FROM TestInitBehavior", LogLevel.Warning);   

            return [url, result];
        });

        return instance;
    };
}

function testingConfig(settings: ITestingSettings): (instance: Queryable2) => Queryable2 {

    return (instance) => {

        instance
            .using(MSAL(settings.testing.sp.msal.init, settings.testing.sp.msal.scopes))
            .using(InjectHeaders({
                "Accept": "application/json",
                "Content-Type": "application/json;odata=verbose;charset=utf-8",
                "User-Agent": "NONISV|SharePointPnP|PnPjs",
                "X-ClientService-ClientTag": "PnPCoreJS:3.0.0-exp",
            }))
            .using(NodeFetchWithRetry())
            // .using(NodeFetchWithRetry(2))
            // .using(NodeFetch())
            .using(DefaultParse())
            // .using(TextParse())
            // .using(JSONParse())
            // .using(Proxy("https://127.0.0.1:8888"))
            // .using(Caching("session", true))
            .using(TestInitBehavior())
            .on.pre(async function (url, init, result) {

                // extend(this, {
                //     execute: ""
                // });

                // TODO:: replacement for isAbsolute? SHould this be its own behavior?
                if (!isUrlAbsolute(url)) {
                    url = (new URL(url, settings.testing.sp.url)).toString();
                }

                init.cache = "no-cache";
                init.credentials = "same-origin";

                return [url, init, result];
            })
            .on.error((err) => {
                console.error("caught it");
                console.error(err);
            })
            .on.log(function (message, level) {

                if (level >= LogLevel.Verbose) {

                    console.log(`${Date.now()}: ${message}`);
                }

            }).on.post(async (_url: URL, result: any) => {

                console.log(JSON.stringify(result));

                return [_url, result];

            });

        return instance;
    };
}

export async function Example(settings: ITestingSettings) {

    try {

        const sp = sp2("https://318studios.sharepoint.com/sites/dev/1844b17e-9287-4b63-afa8-08b02f283b1f").using(testingConfig(settings));

        const w = sp.web.features;

        // TODO:: can this replace extend factory?? sorta
        // w.on.init(function (this: IWeb) {

        //     const o = extend(this, {

        //         async execute(): Promise<any> {
        //             console.log("HA HA");
        //         },
        //     });

        //     return o;
        // });

        const yyy = await w();

        const yyyy = await sp.web.features();

        console.log(`here: ${JSON.stringify(yyy)}`);


        console.log(`here: ${JSON.stringify(yyyy)}`);

        // const [batch, execute] = sp.createBatch();

        // // this model removes the difficulty of knowing when to call usingBatch and instead you call it upfront each time
        // sp.using(batch).web();

        // sp.using(batch).web.features.getById("e3dc7334-cec0-4d2c-8b90-e4857698fc4e").deactivate();

        // await execute();

    } catch (e) {

        console.error(e);
    }

    // TODO:: need to work on the inheritance and ensuring the right events are fired for 
    // on data etc and that requests are really going out.
    // w.on.post(async (url: URL, result: any) => {

    //     console.log("I am here!");

    //     return [url, result];
    // });

    // const u = await w();

    // // TODO:: right now this request isn't sent because sp4 shares the data observers with sp3 due to inheritance so once the first
    // // request resolves the second also instantly resolves. In this case it is the same request, but later it wouldn't be
    // const uu = await sp4.web();


    // TODO:: still need to fix up auth for batches. Can it get it from some central place?? DO we now run batch as a queryable with associated events for the core request? Yes for consistency.
    // const hackAuth = MSAL(settings.testing.sp.msal.init, settings.testing.sp.msal.scopes);
    // const [, init,] = await Reflect.apply(hackAuth, t, ["", { headers: {} }, undefined]);

    // const [batch, executeBatch] = createBatch(settings.testing.sp.url, NodeSend(), init.headers["Authorization"]);

    // t.using(batch);
    // t2.using(batch);

    // await executeBatch();


    // Logger.subscribe(new ConsoleListener());

    // // most basic implementation
    // t.on.log((message: string, level: LogLevel) => {
    //     console.log(`[${level}] ${message}`);
    // });

    // // super easy debug
    // t.on.error(console.error);
    // t2.on.error(console.error);

    // let notExist: boolean = false;
    // t3.on.error((err: HttpRequestError) => {
    //     if (err.status == 404) {
    //         notExist = true;
    //     }
    // });
    // // MSAL config via using?
    // // t.using(MSAL2(settings.testing.sp.msal.init, settings.testing.sp.msal.scopes));
    // t3.using(MSAL2(settings.testing.sp.msal.init, settings.testing.sp.msal.scopes));

    // // or directly into the event?
    // // t.on.pre(MSAL(settings.testing.sp.msal.init, settings.testing.sp.msal.scopes));

    // how to register your own pre-handler
    // t.on.pre(async function (url: string, init: RequestInit, result: any) {

    //     // example of setting up default values
    //     url = combine(url, "_api/web");

    //     init.headers["Accept"] = "application/json";
    //     init.headers["Content-Type"] = "application/json;odata=verbose;charset=utf-8";

    //     this.log(`Url: ${url}`);

    //     return [url, init, result];
    // });

    // t.using(InjectHeaders({
    //     "Accept": "application/json",
    //     "Content-Type": "application/json;odata=verbose;charset=utf-8",
    // }));

    // t2.using(InjectHeaders({
    //     "Accept": "application/json",
    //     "Content-Type": "application/json;odata=verbose;charset=utf-8",
    // }));

    // t3.using(Caching2());

    // use the basic caching that mimics v2
    // t.using(Caching());

    // we can replace
    // t.on.send(NodeSend());
    // t.on.send(NodeSend(), "replace");

    // t3.on.send(NodeSend());

    // we can register multiple parse handlers to run in sequence
    // here we are doing some error checking??
    // TODO:: do we want a specific response validation step? seems maybe too specialized?
    // t.on.parse(async function (url: string, response: Response, result: any) {

    //     if (!response.ok) {
    //         // within these observers we just throw to indicate an unrecoverable error within the pipeline
    //         throw await HttpRequestError.init(response);
    //     }

    //     return [url, response, result];
    // });

    // t2.on.parse(async function (url: string, response: Response, result: any) {

    //     if (!response.ok) {
    //         // within these observers we just throw to indicate an unrecoverable error within the pipeline
    //         throw await HttpRequestError.init(response);
    //     }

    //     return [url, response, result];
    // });

    // // we can register multiple parse handlers to run in sequence
    // t.on.parse(async function (url: string, response: Response, result: any) {

    //     // only update result if not done?
    //     if (typeof result === "undefined") {
    //         result = await response.text();
    //     }

    //     // only update result if not done?
    //     if (typeof result !== "undefined") {
    //         result = JSON.parse(result);
    //     }

    //     return [url, response, result];
    // });

    // // we can register multiple parse handlers to run in sequence
    // t2.on.parse(async function (url: string, response: Response, result: any) {

    //     // only update result if not done?
    //     if (typeof result === "undefined") {
    //         result = await response.text();
    //     }

    //     // only update result if not done?
    //     if (typeof result !== "undefined") {
    //         result = JSON.parse(result);
    //     }

    //     return [url, response, result];
    // });

    // const uu = t2.clear.parse();

    // console.log(uu);

    // a passthrough handler for each moment is no longer required
    // t.on.post(async (url, result) => [url, result]);
    // t2.on.post(async (url, result) => [url, result]);

    // try {

    //     t.start().then(d => {
    //         console.log(d)
    //     });

    //     t2.start().then(d => {
    //         console.log(d)
    //     });

    //     await executeBatch();

    // } catch (e) {
    //     console.error("fail");
    //     console.error(e);
    // }



    // process.exit(0);
}