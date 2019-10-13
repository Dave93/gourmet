var createError = require('http-errors');
require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var app = express();

const frameguard = require('frameguard')
const Telegraf = require('telegraf');
const TelegrafI18n = require('telegraf-i18n');
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const Router = require('telegraf/router');
const {match, reply} = require('telegraf-i18n');
const Markup = require('telegraf/markup');
const LocalSession = require('telegraf-session-local');
const TelegrafInlineMenu = require('telegraf-inline-menu');
const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const WizardScene = require("telegraf/scenes/wizard");
const DirectusSDK = require("@directus/sdk-js");
const axios = require('axios');
const uuidv1 = require('uuid/v1');
const client = new DirectusSDK({
    url: process.env.SHOP_API_URL,
    project: "_",
    token: "1531321321"
});
const querystring = require('querystring');
const i18n = new TelegrafI18n({
    defaultLanguage: 'ru',
    allowMissing: false, // Default true
    directory: path.resolve(__dirname, 'locales')
});
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
var queryParser = require('express-query-int');

const adapter = new FileSync(__dirname + '/users.db');
const db = low(adapter);
const FileDownload = require('js-file-download');
const fs = require('fs');
const YAML = require('yaml');
const sanitizeHtml = require('sanitize-html');
const multer  = require('multer');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
    }
})

const upload = multer({ storage: storage });


const sanitizeOptions = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'br' ],
    allowedAttributes: {
        'a': [ 'href' ]
    },
    transformTags: {
        'strong': 'b',
    },
    allowedIframeHostnames: ['www.youtube.com']
};

db.defaults({ cart: [], reviews: [], catalog_section: [], products: [], posts: [], discounts:[], settings: {} })
    .write()
// const BX24 = require('bitrix24-promise');
//
// const initBX24 = async () => {
//     await BX24.initialize({
//         url: process.env.BX_DOMAIN,
//         credentials:{
//             client: {
//                 id: process.env.BX_APP_ID,
//                 secret: process.env.BX_APP_SECRET
//             },
//             auth: {
//                 tokenHost: 'https://oauth.bitrix.info',
//                 tokenPath: '/oauth/token/',
//                 authorizePath: '/oauth/authorize'
//             },
//             user: {
//                 login: 'yul.davron.93@gmail.com',
//                 password: 'CA2688255'
//             }
//         },
//         scope: ['crm', 'lists']
//     });
//
//     await BX24.authenticate();
//
//     console.log('ddd');
// }

function compareValues(key, order='asc') {
    return function(a, b) {
      if(!a.hasOwnProperty(key) || 
         !b.hasOwnProperty(key)) {
          return 0; 
      }
      
      const varA = (typeof a[key] === 'string') ? 
        a[key].toUpperCase() : a[key];
      const varB = (typeof b[key] === 'string') ? 
        b[key].toUpperCase() : b[key];
        
      let comparison = 0;
      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
      return (
        (order == 'desc') ? 
        (comparison * -1) : comparison
      );
    };
  }

function numberWithSpaces(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

const serializeQuery = function(params, prefix) {
    const query = Object.keys(params).map((key) => {
        const value  = params[key];

        if (params.constructor === Array)
            key = `${prefix}[]`;
        else if (params.constructor === Object)
            key = (prefix ? `${prefix}[${key}]` : key);

        if (typeof value === 'object')
            return serializeQuery(value, key);
        else
            return `${key}=${encodeURIComponent(value)}`;
    });

    return [].concat.apply([], query).join('&');
}

Object.defineProperty(Array.prototype, 'chunk_inefficient', {
    value: function (chunkSize) {
        var array = this;
        return [].concat.apply([],
            array.map(function (elem, i) {
                return i % chunkSize ? [] : [array.slice(i, i + chunkSize)];
            })
        );
    }
});
bot.use(i18n.middleware());

const create = new WizardScene(
    "create", // Имя сцены
    async (ctx) => {

        const chat = await ctx.getChat();
        const aboutMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                m.callbackButton("🇺🇿 O'zbekcha"),
                m.callbackButton("🇷🇺 Русский")
            ]).resize());

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD]
        }));

        if(!bxContact.data.result.length) {
            let contactData = {
                'fields': {
                    'NAME': chat.first_name,
                    'LAST_NAME': chat.last_name
                },
                params: { "REGISTER_SONET_EVENT": "Y" }
            };
            contactData.fields[process.env.BX_CHAT_ID_FIELD] = chat.id;
            contactData.fields[process.env.BX_LANG_FIELD] = '';
            const res = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.contact.add', contactData);
        }

        ctx.reply(ctx.i18n.t('choose_language'), aboutMenu);
        return ctx.wizard.next(); // Переходим к следующему обработчику.
    },
    async (ctx) => {
        const aboutMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.removeKeyboard());
        let lang = 'ru';
        if (ctx.message.text === "🇺🇿 O'zbekcha") {
            lang = 'uz';
        }
        const chat = await ctx.getChat();

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD]
        }));

        if(bxContact.data.result.length) {
            let contactData = {
                'id': bxContact.data.result[0].ID,
                'fields': {

                }
            };
            contactData.fields[process.env.BX_LANG_FIELD] = lang;
            const res = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.contact.update', contactData);
        }

        ctx.i18n.locale(lang);
        ctx.reply(ctx.i18n.t('get_name'), aboutMenu);
        return ctx.wizard.next(); // Переходим к следующему обработчику.
    },
    async (ctx) => {

        const chat = await ctx.getChat();

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD,process.env.BX_LANG_FIELD]
        }));

        if(bxContact.data.result.length) {

            let contactData = {
                id: bxContact.data.result[0].ID,
                fields: {
                    NAME: ctx.message.text
                }
            };
            const res = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.contact.update', contactData);
        }
        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);

        // await client.put('/accounts/' + dbUser.userId, { first_name: ctx.message.text });

        ctx.reply(ctx.i18n.t('get_phone'), {
            reply_markup: {
                keyboard: [[{
                    text: ctx.i18n.t('send_phone'),
                    request_contact: true
                }]],
                resize_keyboard: true
            }
        });
        // ctx.reply(ctx.i18n.t('get_phone'));
        return ctx.wizard.next(); // Переходим к следующему обработчику.
    },
    async (ctx) => {
        let phoneNumber = ctx.message.text;
        if (ctx.message.contact) {
            phoneNumber = ctx.message.contact.phone_number;
        }
        const chat = await ctx.getChat();

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
        }));

        if(bxContact.data.result.length) {
            let contactData = {
                id: bxContact.data.result[0].ID,
                fields: {
                    PHONE: [ { "VALUE": phoneNumber, "VALUE_TYPE": "MOBILE" } ]
                }
            };
            const res = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.contact.update', contactData);
        }
        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        const aboutMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                [
                    m.callbackButton(ctx.i18n.t('button_catalog'))
                ],
                [
                    m.callbackButton(ctx.i18n.t('button_contacts')),
                    m.callbackButton(ctx.i18n.t('button_review')),
                ],
                [
                    m.callbackButton(ctx.i18n.t('settings')),
                ],
            ]).resize());

        ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);
        return ctx.scene.leave();
    }
);

const reviewScene = new WizardScene(
    'review',
    async (ctx) => {
        const chat = await ctx.getChat();
        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD,process.env.BX_LANG_FIELD]
        }));
        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        const aboutMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                [ctx.i18n.t('back')]
            ]).resize());
        ctx.reply(ctx.i18n.t('send_review'), aboutMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        const chat = await ctx.getChat();
        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD,process.env.BX_LANG_FIELD]
        }));
        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        if (ctx.message.text == ctx.i18n.t('back')) {
            const aboutMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.keyboard([
                    [
                        m.callbackButton(ctx.i18n.t('button_catalog')),
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('button_contacts')),
                        m.callbackButton(ctx.i18n.t('button_review')),
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('settings'))
                    ]
                ]).resize());
            ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);
            return ctx.scene.leave();
        } else {
            const chat = await ctx.getChat();
            const rootSection = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.productsection.list?' + serializeQuery({
                'filter': {
                    'NAME': 'Отзывы'
                },
                'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
            }));

            if(rootSection.data.result.length) {
                let date = new Date();
                let fields = {
                    'NAME': 'Новый отзыв ' + date.toLocaleString('ru'),
                    'DESCRIPTION': ctx.message.text,
                    'IBLOCK_SECTION_ID': rootSection.data.result[0].ID,
                    'SECTION_ID': rootSection.data.result[0].ID
                };
                fields[process.env.BX_PRODUCT_CRM_FIELD] = bxContact.data.result[0].ID;
                const review = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.product.add?'+ serializeQuery({
                    'fields': fields
                }));
            }

            const aboutMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.keyboard([
                    [
                        m.callbackButton(ctx.i18n.t('button_catalog')),
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('button_contacts')),
                        m.callbackButton(ctx.i18n.t('button_review')),
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('settings'))
                    ]
                ]).resize());

            ctx.reply(ctx.i18n.t('thanks_review'), aboutMenu);
            return ctx.scene.leave();
        }
    }
);

const settingsScene = new WizardScene(
    'settings',
    async (ctx) => {
        const chat = await ctx.getChat();

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
        }));

        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        const settingsMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                [
                    m.callbackButton(ctx.i18n.t('edit_fio')),
                    m.callbackButton(ctx.i18n.t('edit_phone')),
                ],
                [
                    m.callbackButton(ctx.i18n.t('choose_language')),
                ],
                [
                    m.callbackButton(ctx.i18n.t('back'))
                ]
            ]).resize());

        ctx.reply(ctx.i18n.t('select_an_action'), settingsMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        const chat = await ctx.getChat();

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
        }));

        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        switch (ctx.message.text) {
            case ctx.i18n.t('edit_phone'):
                ctx.scene.enter("editNumber");
                break;
            case ctx.i18n.t('edit_fio'):
                ctx.scene.enter("editFio");
                break;
            case ctx.i18n.t('choose_language'):
                ctx.scene.enter("changeLanguage");
                break;
            default:
                const aboutMenu = Telegraf.Extra
                    .markdown()
                    .markup((m) => m.keyboard([
                        [
                            m.callbackButton(ctx.i18n.t('button_catalog'))
                        ],
                        [
                            m.callbackButton(ctx.i18n.t('button_contacts')),
                            m.callbackButton(ctx.i18n.t('button_review')),
                        ],
                        [
                            m.callbackButton(ctx.i18n.t('settings')),
                        ],
                    ]).resize());

                ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);
                break;
        }
        return ctx.scene.leave();
    }
);

const editFioScene = new WizardScene(
    'editFio',
    async (ctx) => {
        const settingsMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                [ctx.i18n.t('back')]
            ]).resize());
        ctx.reply(ctx.i18n.t('enter_your_name'), settingsMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text == ctx.i18n.t('back')) {
            return ctx.scene.enter("settings");
        } else {
            const chat = await ctx.getChat();
            let editedName = ctx.message.text;
            let bxContactFilter = {

            };

            bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

            const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
                'filter': bxContactFilter,
                'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
            }));

            if(bxContact.data.result.length) {

                let contactData = {
                    id: bxContact.data.result[0].ID,
                    fields: {
                        NAME: editedName
                    }
                };
                const res = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.contact.update', contactData);
            }
            ctx.scene.enter("settings");
        }
        return ctx.scene.leave();
    },
);


const editNumberScene = new WizardScene(
    'editNumber',
    async (ctx) => {
        const settingsMenu = Telegraf.Extra
            .HTML()
            .markup((m) => m.keyboard([
                [
                    m.contactRequestButton(ctx.i18n.t('send_phone'))
                ],
                [
                    m.callbackButton(ctx.i18n.t('back'))
                ]
            ]).resize());
        ctx.reply(ctx.i18n.t('enter_your_phone'), settingsMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {

        if (ctx.message.text == ctx.i18n.t('back')) {
            return ctx.scene.enter("settings");
        } else {
            let editedPhone = ctx.message.text;
            if (ctx.message.contact) {
                editedPhone = ctx.message.contact.phone_number;
            }
            const chat = await ctx.getChat();
            let bxContactFilter = {

            };

            bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

            const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
                'filter': bxContactFilter,
                'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
            }));

            ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
            if (bxContact.data.result.length) {
                let contactData = {
                    id: bxContact.data.result[0].ID,
                    fields: {
                        PHONE: [ { "VALUE": editedPhone, "VALUE_TYPE": "MOBILE" } ]
                    }
                };
                const res = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.contact.update', contactData);
            }
            ctx.scene.enter("settings");
            return ctx.scene.leave();
        }
    }
);

const changeLanguageScene = new WizardScene(
    'changeLanguage',
    async (ctx) => {

        const aboutMenu = await Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                m.callbackButton("🇺🇿 O'zbekcha"),
                m.callbackButton("🇷🇺 Русский")
            ]).resize());
        ctx.reply(ctx.i18n.t('choose_language'), aboutMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        let lang = 'ru';
        if (ctx.message.text === "🇺🇿 O'zbekcha") {
            lang = 'uz';
        }
        const chat = await ctx.getChat();

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
        }));

        ctx.i18n.locale(lang);
        if(bxContact.data.result.length) {

            let contactData = {
                id: bxContact.data.result[0].ID,
                fields: {

                }
            };
            contactData.fields[process.env.BX_LANG_FIELD] = lang;
            const res = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.contact.update', contactData);
        }
        return ctx.scene.enter("settings");
    },
);

const makeOrder = new WizardScene(
    'make_order',
    async (ctx) => {
        const chat = await ctx.getChat();
        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
        }));

        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        const aboutMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                [
                    m.locationRequestButton(ctx.i18n.t('send_location')),
                    m.callbackButton(ctx.i18n.t('back'))
                ],
            ]).resize())
        ctx.session.orderMenuMessageId = '';
        ctx.reply(ctx.i18n.t('send_location'), aboutMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        const chat = await ctx.getChat();
        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
        }));

        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        if(ctx.message.text == ctx.i18n.t('back')) {
            const aboutMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.keyboard([
                    [
                        m.callbackButton(ctx.i18n.t('button_catalog'))
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('button_contacts')),
                        m.callbackButton(ctx.i18n.t('button_review')),
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('settings')),
                    ],
                ]).resize());
            await ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);

            await getCatalog(ctx);
            return ctx.scene.leave();
        } else {

            let bxContactFilter = {

            };
            let bxDeal = '';

            bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

            const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
                'filter': bxContactFilter,
                'select': ['*', process.env.BX_CHAT_ID_FIELD]
            }));

            if(bxContact.data.result.length) {
                let dealFields = {
                    "TITLE": "Новый заказ ",
                    "STAGE_ID": 'NEW',
                    "CONTACT_ID": bxContact.data.result[0].ID,
                    "OPENED": "Y",
                    "ASSIGNED_BY_ID": process.env.BX_DEAL_DEFAULT_ASSIGNED
                };
                if(ctx.message.location) {
                    dealFields[process.env.BX_DEAL_LOCATION_FIELD] = 'Адрес|' + ctx.message.location.latitude + ';' + ctx.message.location.longitude;
                } else {
                    dealFields[process.env.BX_DEAL_ADDRESS_FIELD] = ctx.message.text;
                }
                bxDeal = await axios.post(process.env.BX_WEBHOOK_URL + 'crm.deal.add', {
                    'fields': dealFields,
                    params: { "REGISTER_SONET_EVENT": "Y" }
                });

                // console.log(bxDeal);
            }

            const cart = await db.get('cart')
                .find({ chat_id: chat.id })
                .value();

            if(cart) {
                if(cart.products.length) {
                    let productIds = {};
                    let productPrices = {};
                    let nameField = 'name';

                    if(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz') {
                        nameField = 'name_uz';
                    }

                    await asyncForEach(cart.products, async item => {
                        let product =  await db.get('products')
                            .find({ id: item.product_id })
                            .value();
                        productIds[product.id] = product.product_id;
                        productPrices[product.id] = product['price'];
                    });

                    let totalPrice = 0;
                    let productRows = [];
                    await asyncForEach(cart.products, async item => {
                        let price = parseInt(productPrices[item.product_id], 0) * parseInt(item.count, 0);
                        totalPrice += price;
                        productRows.push({
                            PRODUCT_ID: productIds[item.product_id],
                            PRICE: parseInt(productPrices[item.product_id], 0),
                            CURRENCY_ID: 'UZS',
                            QUANTITY: item.count
                        });
                    });
                    db.get('cart')
                        .remove({ chat_id: chat.id })
                        .write();

                    const discount = await db.get('discounts')
                        .filter(discount => discount.order_price <= totalPrice)
                        .value();
        
                    
        
                    let newDiscount = [];
                    for(var i = 0; i<discount.length; i++) {
                        newDiscount.push({
                            order_price: parseInt(discount[i].order_price, 0),
                            discount: parseInt(discount[i].discount, 0)
                        });
                    }
        
                    let resultDiscounts = newDiscount.sort(compareValues('order_price', 'desc'));
                    if(resultDiscounts[0]) {
                        let discountVal = resultDiscounts[0].discount;
                        let discountPerProduct = discountVal/productRows.length;
                        for(var i = 0; i<productRows.length; i++) {
                            productRows[i].DISCOUNT_SUM = discountPerProduct / productRows[i].QUANTITY;
                            productRows[i].DISCOUNT_TYPE_ID = 1;
                        }
                    }

                    await axios.post(process.env.BX_WEBHOOK_URL + 'crm.deal.productrows.set', {
                        'id': bxDeal.data.result,
                        'rows': productRows
                    });

                    await axios.post(process.env.BX_WEBHOOK_URL + 'crm.deal.update', {
                        id: bxDeal.data.result,
                        fields: {
                            'TITLE': 'Новый заказ #' + bxDeal.data.result,
                            'OPPORTUNITY': (resultDiscounts[0] ? totalPrice - resultDiscounts[0].discount : totalPrice)
                        }
                    });
                }
            }

            // await axios.post(process.env.BX_WEBHOOK_URL + 'tasks.task.add?' + serializeQuery({
            //     'fields': {
            //         'TITLE': `Необходимо обработать заказ №${bxDeal.data.result}`,
            //         'RESPONSIBLE_ID': process.env.BX_DEAL_DEFAULT_ASSIGNED,
            //         'UF_CRM_TASK': [`D_${bxDeal.data.result}`]
            //     }
            // }));

            axios.post(process.env.BX_WEBHOOK_URL + 'im.message.add?' + serializeQuery({
                'MESSAGE': `Необходимо обработать [URL=/crm/deal/details/${bxDeal.data.result}/]заказ №${bxDeal.data.result}[/URL]`,
                'DIALOG_ID': process.env.BX_DEAL_DEFAULT_ASSIGNED,
                'URL_PREVIEW': 'Y'
            }));

            await ctx.reply(ctx.i18n.t('order_success'));
            const aboutMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.keyboard([
                    [
                        m.callbackButton(ctx.i18n.t('button_catalog'))
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('button_contacts')),
                        m.callbackButton(ctx.i18n.t('button_review')),
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('settings')),
                    ],
                ]).resize());
            await ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);
            return ctx.scene.leave();
        }
    }
);

// Создаем менеджера сцен
const stage = new Stage();

// Регистрируем сцену создания матча
stage.register(create);
stage.register(reviewScene);
stage.register(settingsScene);
stage.register(editFioScene);
stage.register(editNumberScene);
stage.register(changeLanguageScene);
stage.register(makeOrder);

bot.catch((err) => {
    console.log('Ooops', err)
});
bot.use(async (ctx, next) => {
    await i18n.loadLocales(path.resolve(__dirname, 'locales'));
    return next(ctx);
});
bot.use((new LocalSession({database: 'example_db.json'})).middleware());
bot.use(stage.middleware());

bot.action("create", (ctx) => ctx.scene.enter("create"));
bot.start((ctx) => ctx.scene.enter("create"));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.scene.enter("create"));



const getContactsInfo = async (ctx) => {
    const chat = await ctx.getChat();
    let bxContactFilter = {

    };

    bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

    const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
        'filter': bxContactFilter,
        'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
    }));

    ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
    const settings = await db.get('settings')
        .value();
    let address = (bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz' ? settings.address_uz : settings.address);
    address = sanitizeHtml(address, sanitizeOptions);
    address = address.replace(/\<br \/\>/g, "\n");
    try {
        return ctx.reply(address);
    } catch (e) {

    }

};

const getStock = async (ctx) => {
    const chat = await ctx.getChat();
    let bxContactFilter = {

    };

    bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

    const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
        'filter': bxContactFilter,
        'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
    }));

    ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);

    const rootSection = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.productsection.list?' + serializeQuery({
        'filter': {
            'NAME': 'Акции'
        },
        'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
    }));

    const langSection = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.productsection.list?' + serializeQuery({
        'filter': {
            'NAME': bxContact.data.result[0][process.env.BX_LANG_FIELD].toUpperCase(),
            'SECTION_ID': rootSection.data.result[0].ID
        },
        'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
    }));

    if(langSection.data.result.length) {
        const stock = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.product.list?' + serializeQuery({
            'filter': {
                'SECTION_ID': langSection.data.result[0].ID
            },
            'select': ['*'],
            'order': {
                'ID': 'DESC'
            },
            'limit': 1
        }));

        if(stock.data.result.length) {
            let text = stock.data.result[0].DESCRIPTION;
            text = text.replace('<p>', '');
            text = text.replace( '</p>','');
            ctx.reply(text, {parse_mode: "HTML"});
        } else {
            ctx.reply(ctx.i18n.t('no_stock'));
        }
    } else {
        ctx.reply(ctx.i18n.t('no_stock'));
    }
};

const getCatalog = async ctx => {
    const chat = await ctx.getChat();

    let bxContactFilter = {

    };

    bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

    const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
        'filter': bxContactFilter,
        'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
    }));

    ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);

    const sections = await db.get('catalog_section')
        .filter()
        .value();
    let nameField = 'name';
    if(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz') {
        nameField = 'name_uz';
    }

    let menu = [];


    let menuCategories = [];
    sections.forEach(item => {
        menuCategories.push({
            name: item[nameField],
            id: item.id
        });
    });

    menuCategories.forEach(function (item) {
        menu.push(Markup.callbackButton(item.name, 'category:' + item.id));
    });

    const cart = await db.get('cart')
        .find({ chat_id: chat.id })
        .value();

    // const cart = await client.getItems('shopping_cart', {
    //     filter: {
    //         user_id: user.data.id
    //     }
    // });

    const cartMenu = [];

    if(cart) {
        cartMenu.push(Markup.callbackButton(ctx.i18n.t('cart'), 'cart:'));
        cartMenu.push(Markup.callbackButton(ctx.i18n.t('order'), 'order:'));
    }

    let readyMenu = [];

    if(menu.length) {
        readyMenu = menu.chunk_inefficient(2);
        readyMenu.push(cartMenu);
    }

    const catMenu = Markup.inlineKeyboard(readyMenu).extra();
    if(ctx.session.orderMenuMessageId) {
        await ctx.deleteMessage(ctx.session.orderMenuMessageId);
    }
    const message = await ctx.reply(ctx.i18n.t('choose_catalog_category'), catMenu);
    ctx.session.orderMenuMessageId = message.message_id;
    return;
}

const addProductToCart = async (ctx, count) => {
    if(ctx.scene.session.productyId && count > 0) {
        const chat = await ctx.getChat();

        let bxContactFilter = {

        };

        bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

        const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
            'filter': bxContactFilter,
            'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
        }));

        ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
        const cart = await db.get('cart')
            .find({ chat_id: chat.id })
            .value();

        if(cart) {
            let products = cart.products;
            products.push({
                product_id: ctx.scene.session.productyId,
                count: count
            });
            await db.get('cart')
                .find({ chat_id: chat.id })
                .assign({products: products})
                .write();
        } else {
            const cart = await db.get('cart')
                .push({ chat_id: chat.id, products: [
                        {
                            product_id: ctx.scene.session.productyId,
                            count: count
                        }
                    ] })
                .write();
        }
        try {
            ctx.answerCbQuery(ctx.i18n.t('product_added'));

            const cart = await db.get('cart')
                .find({ chat_id: chat.id })
                .value();
            if(cart) {
                const cartItems = cart.products;
                if(cartItems.length) {

                    let productNames = {};
                    let productPrices = {};

                    await asyncForEach(cartItems, async item => {
                        let product =  await db.get('products')
                            .find({ id: item.product_id })
                            .value();
                        productPrices[product.id] = product['price'];
                    });

                    let totalPrice = 0;
                    cartItems.forEach((item, index) => {
                        let price = parseInt(productPrices[item.product_id], 0) * parseInt(item.count, 0);
                        totalPrice += price;
                    });

                    const discount = await db.get('discounts')
                        .filter(discount => discount.order_price <= totalPrice)
                        .value();

                   

                   let newDiscount = [];
                   for(var i = 0; i<discount.length; i++) {
                        newDiscount.push({
                            order_price: parseInt(discount[i].order_price, 0),
                            discount: parseInt(discount[i].discount, 0)
                        });
                   }

                   let resultDiscounts = newDiscount.sort(compareValues('order_price', 'desc'));
                   if(resultDiscounts[0]) {
                        ctx.answerCbQuery(ctx.i18n.t('discount_applied'));
                   }
                }
            }

        } catch(e) {

        }

        await getCatalog(ctx);
    }
}

const getCart = async (user, ctx) => {
    const chat = await ctx.getChat();
    const cart = await db.get('cart')
        .find({ chat_id: chat.id })
        .value();
    if(cart) {
        const cartItems = cart.products;
        if(cartItems.length) {
            let cartText = '<b>' + ctx.i18n.t('cart_items_title') + ':' + '</b> \n';

            let productNames = {};
            let productPrices = {};
            let nameField = 'name';

            if(user.data.result[0][process.env.BX_LANG_FIELD] == 'uz') {
                nameField = 'name_uz';
            }

            await asyncForEach(cartItems, async item => {
                let product =  await db.get('products')
                    .find({ id: item.product_id })
                    .value();
                productNames[product.id] = product[nameField];
                productPrices[product.id] = product['price'];
            });

            let totalPrice = 0;
            let deleteButtons = [];
            cartItems.forEach((item, index) => {
                deleteButtons.push(Markup.callbackButton('❌ ' + productNames[item.product_id] + ' x ' + item.count, 'deleteProduct:' + index));
                let price = parseInt(productPrices[item.product_id], 0) * parseInt(item.count, 0);
                totalPrice += price;
                cartText += productNames[item.product_id] + ' x ' + item.count + ' = ' + numberWithSpaces(price) + ' ' + ctx.i18n.t('currency') + ' \n';
            });

            cartText += '\n';

            const discount = await db.get('discounts')
                .filter(discount => discount.order_price <= totalPrice)
                .value();

            

            let newDiscount = [];
            for(var i = 0; i<discount.length; i++) {
                newDiscount.push({
                    order_price: parseInt(discount[i].order_price, 0),
                    discount: parseInt(discount[i].discount, 0)
                });
            }

            let resultDiscounts = newDiscount.sort(compareValues('order_price', 'desc'));
            if(resultDiscounts[0]) {
                cartText += '<b>' + ctx.i18n.t('cart_discount') + ': ' + numberWithSpaces(resultDiscounts[0].discount) + ' ' + ctx.i18n.t('currency') + '</b>';
                cartText += '\n';
                cartText += '<b>' + ctx.i18n.t('cart_total_price') + ': ' + numberWithSpaces(totalPrice - resultDiscounts[0].discount) + ' ' + ctx.i18n.t('currency') + '</b>';
            } else {
                cartText += '<b>' + ctx.i18n.t('cart_total_price') + ': ' + numberWithSpaces(totalPrice) + ' ' + ctx.i18n.t('currency') + '</b>';
            }

            let deleteProducts = [];

            if(deleteButtons.length) {
                deleteProducts = deleteButtons.chunk_inefficient(2);
            }

            let cartMenu = [
                [
                    Markup.callbackButton(ctx.i18n.t('back'), 'back'),
                    Markup.callbackButton(ctx.i18n.t('order'), 'order:'),
                ],
                [
                    Markup.callbackButton(ctx.i18n.t('clear_cart'), 'clear_cart')
                ]
            ];

            deleteProducts.forEach(deleteMenu => {
                cartMenu.push(deleteMenu);
            });

            return ctx.editMessageText(
                cartText,
                Markup.inlineKeyboard(
                    cartMenu
                ).extra({parse_mode: 'HTML'})
            );
        } else {
            return ctx.answerCbQuery(ctx.i18n.t('cart_empty'));
        }
    } else {
        return ctx.answerCbQuery(ctx.i18n.t('cart_empty'));
    }
}

bot.hears('📱 Контактная информация', getContactsInfo);
bot.hears('📱 Aloqa ma\'lumotlari', getContactsInfo);
bot.hears('📝 Оставить отзыв', (ctx) => ctx.scene.enter("review"));
bot.hears('📝 Fikr qoldirish', (ctx) => ctx.scene.enter("review"));
bot.hears('🛒 Buyurtma qilish', getCatalog);
bot.hears('🛒 Начать заказ', getCatalog);
bot.hears('⚙️ Настройки', (ctx) => ctx.scene.enter("settings"));
bot.hears('⚙️ Sozlamalar', (ctx) => ctx.scene.enter("settings"));
bot.hears('🇷🇺 Выберите язык', (ctx) => ctx.scene.enter("changeLanguage"));
bot.hears('🇺🇿 Tilni tanlang', (ctx) => ctx.scene.enter("changeLanguage"));
bot.hears('🏷 Акции', getStock);
bot.hears('🏷 Aktsiyalar', getStock);

bot.hears(/[0-9]+/, async (ctx) => {
    if(ctx.scene.session.productyId > 0) {
        await addProductToCart(ctx, parseInt(ctx.message.text, 0));
    }
});


bot.action(/.+/, async (ctx) => {
    let input = ctx.match.input.split(':');
    const chat = await ctx.getChat();

    let bxContactFilter = {

    };

    bxContactFilter[process.env.BX_CHAT_ID_FIELD] = chat.id;

    const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
        'filter': bxContactFilter,
        'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
    }));

    ctx.i18n.locale(bxContact.data.result[0][process.env.BX_LANG_FIELD]);
    switch (input[0]) {
        case 'category':
            if(input[1]) {
                const categoryId = input[1];

                // const sections = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.productsection.list?' + serializeQuery({
                //     'filter': {
                //         'ID': categoryId
                //     },
                //     'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
                // }));

                // const photoProdFilter = {
                //
                // };

                // photoProdFilter[process.env.BX_PRODUCT_SECTION_CODE_FIELD] = 'PHOTO';
                // const photoProd = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.product.list?' + serializeQuery({
                //     'filter': photoProdFilter
                // }));

                // if(photoProd.data.result[0] && photoProd.data.result[0].PREVIEW_PICTURE) {
                //     await initBX24();
                //     const BXToken = BX24.getToken();
                //     let fileContent = await axios.get(process.env.BX_DOMAIN + photoProd.data.result[0].PREVIEW_PICTURE.showUrl);
                //     console.log(__dirname + '/' + photoProd.data.result[0].PREVIEW_PICTURE.id + '.png');
                //     await fs.writeFileSync(__dirname + '/' + photoProd.data.result[0].PREVIEW_PICTURE.id + '.png', fileContent.data);
                //     // FileDownload(fileContent.data, photoProd.data.result[0].PREVIEW_PICTURE.id + '.png');
                //    await ctx.replyWithPhoto(process.env.BX_DOMAIN + photoProd.data.result[0].PREVIEW_PICTURE.showUrl);
                // }

                ctx.scene.session.categoryId = categoryId;

                const category = await db.get('catalog_section')
                    .find({ id: categoryId })
                    .value();

                const cat = await db.get('products')
                    .filter({ section_id: categoryId })
                    .value();


                let nameField = 'name';

                if(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz') {
                    nameField = 'name_uz';
                }

                let menuProducts = [];
                cat.forEach(item => {
                    menuProducts.push({
                        name: item[nameField],
                        id: item.id
                    });
                });

                let menu = [];
                menuProducts.forEach(function (item) {
                    menu.push(Markup.callbackButton(item.name, 'product:' + item.id))
                });
                menu.push(Markup.callbackButton(ctx.i18n.t('back'), 'back'));
                if(typeof category.file == 'string') {
                    if (ctx.session.orderMenuMessageId) {
                        await ctx.deleteMessage(ctx.session.orderMenuMessageId);
                    }
                    let text = '<b>' + category[nameField] + "</b>\n";
                    text += sanitizeHtml(category[(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz' ? 'description_uz' : 'description')] + "\n\n", sanitizeOptions).replace(/\<br \/\>/g, "\n");
                    text += ctx.i18n.t('choose_category_product');
                    let message = await bot.telegram.sendPhoto(bxContact.data.result[0][process.env.BX_CHAT_ID_FIELD], `${process.env.DOMAIN}${category.file}`, {
                        caption: text,
                        reply_markup: Markup.inlineKeyboard(menu.length ? menu.chunk_inefficient(2) : []),
                        parse_mode: 'HTML'
                    })
                    // const message = await ctx.reply(text, Markup.inlineKeyboard(menu.length ? menu.chunk_inefficient(2) : []).extra());
                    return ctx.session.orderMenuMessageId = message.message_id;
                } else {
                    let text = category[nameField] + "\n";
                    text += category[(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz' ? 'description_uz' : 'description')] + "\n\n";
                    text += ctx.i18n.t('choose_category_product');
                    if (ctx.session.orderMenuMessageId) {
                        await ctx.deleteMessage(ctx.session.orderMenuMessageId);
                    }
                    let message = await ctx.reply(text, Markup.inlineKeyboard(menu.length ? menu.chunk_inefficient(2) : []).extra());
                    return ctx.session.orderMenuMessageId = message.message_id;
                }
            }
            break;
        case 'product':
            if(input[1] == 'count') {
                const count = input[3];
                await addProductToCart(ctx, parseInt(count, 0));
                return;
            } else if(input[1] != 'count') {
                const productId = input[1];
                ctx.scene.session.productyId = productId;

                const product = await db.get('products')
                    .find({ id: productId })
                    .value();


                let nameField = 'name';

                if(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz') {
                    nameField = 'name_uz';
                }

                const markup = Markup.inlineKeyboard(
                    [
                        [
                            Markup.callbackButton('1', 'product:count:' + productId + ':1'),
                            Markup.callbackButton('2', 'product:count:' + productId + ':2'),
                            Markup.callbackButton('3', 'product:count:' + productId + ':3')
                        ],
                        [
                            Markup.callbackButton('4', 'product:count:' + productId + ':4'),
                            Markup.callbackButton('5', 'product:count:' + productId + ':5'),
                            Markup.callbackButton('6', 'product:count:' + productId + ':6')
                        ],
                        [
                            Markup.callbackButton('7', 'product:count:' + productId + ':7'),
                            Markup.callbackButton('8', 'product:count:' + productId + ':8'),
                            Markup.callbackButton('9', 'product:count:' + productId + ':9')
                        ],
                        [
                            Markup.callbackButton(ctx.i18n.t('back'), 'category:' + ctx.scene.session.categoryId),
                            Markup.callbackButton(ctx.i18n.t('all_categories'), 'back')
                        ],
                    ]
                );

                if(typeof product.file == 'string') {
                    if (ctx.session.orderMenuMessageId) {
                        await ctx.deleteMessage(ctx.session.orderMenuMessageId);
                    }
                    let text = product[nameField] + "\n";
                    let desc = product[(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz' ? 'description_uz' : 'description')];
                    text += sanitizeHtml(desc, sanitizeOptions).replace(/\<br \/\>/g, "\n") + "\n\n";
                    text += ctx.i18n.t('product_count_text') + "\n\n";
                    text += `<b>Цена:</b> ${numberWithSpaces(product.price)} ${ctx.i18n.t('currency')}`;
                    const message = await bot.telegram.sendPhoto(bxContact.data.result[0][process.env.BX_CHAT_ID_FIELD], `${process.env.DOMAIN}${product.file}`, {
                        caption: text,
                        reply_markup: markup,
                        parse_mode: 'HTML'
                    });
                    // const message = await ctx.reply(text, Markup.inlineKeyboard(menu.length ? menu.chunk_inefficient(2) : []).extra());
                    return ctx.session.orderMenuMessageId = message.message_id;
                } else {
                    let text = product[nameField] + "\n";
                    text += sanitizeHtml(product[(bxContact.data.result[0][process.env.BX_LANG_FIELD] == 'uz' ? 'description_uz' : 'description')], sanitizeOptions).replace(/\<br \/\>/g, "\n") + "\n\n";
                    text += ctx.i18n.t('product_count_text') + "\n\n";
                    text += `<b>Цена:</b> ${numberWithSpaces(product.price)} ${ctx.i18n.t('currency')}`;
                    if (ctx.session.orderMenuMessageId) {
                        await ctx.deleteMessage(ctx.session.orderMenuMessageId);
                    }

                    let message = await ctx.reply(text, {
                        reply_markup: markup,
                        parse_mode: 'HTML'
                    });
                    return ctx.session.orderMenuMessageId = message.message_id;
                }

                return ctx.editMessageText(
                    ctx.i18n.t('product_count_text'),

                );
            }
            break;
        case 'cart':
            await getCart(bxContact,ctx);
            break;
        case 'clear_cart':
            db.get('cart')
                .remove({ chat_id: chat.id })
                .write();

            await getCatalog(ctx);
            break;
        case 'deleteProduct':

            const cart = await db.get('cart')
                .find({ chat_id: chat.id })
                .value();
            cart.products.splice(input[1], 1);
            ctx.answerCbQuery(ctx.i18n.t('product_deleted'));
            if(cart.products.length) {
                await getCart(bxContact,ctx);
            } else {
                db.get('cart')
                    .remove({ chat_id: chat.id })
                    .write();
                await getCatalog(ctx);
            }
            break;
        case 'order':
            ctx.deleteMessage();
            return ctx.scene.enter('make_order');
            break;
        default:
            await getCatalog(ctx);
            break;
    }

    // return ctx.answerCbQuery(`Oh, ${ctx.match[0]}! Great choice`);
});



app.use(bot.webhookCallback('/tg_shop'));

if(process.env.BOT_ENV == 'DEV') {
    bot.launch();
} else {
    bot.telegram.setWebhook(process.env.DOMAIN + '/tg_shop');
}


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(queryParser());
app.use(express.static(path.join(__dirname, 'client/dist/')));
app.use('/uploads/', express.static(path.join(__dirname, 'public/uploads/')));
// app.use(frameguard({
//     action: 'allow-from',
//     domain: 'https://bitrix24.ru'
//   }));
// console.log(path.join(__dirname, 'client/dist'));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/api/:collection/', async (req, res) => {
    let data = '';
    if(req.params.collection.indexOf('.yaml') != -1) {
        const file = fs.readFileSync(__dirname + '/locales/' + req.params.collection, 'utf8');
        data = YAML.parse(file);
    } else {
        if(Object.keys(req.query).length) {
            data = await db.get(req.params.collection)
                .filter(req.query)
                .value();
        } else {
            data = await db.get(req.params.collection)
                .value();
        }
    }

    return res.send(data);
});

app.options('/api/:collection/', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    return res.send({
        success: true
    });
});

app.options('/api/:collection/:section_id/', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    return res.send({
        success: true
    });
});

app.post('/api/:collection/', upload.single('file'), async (req, res) => {
    if(req.params.collection.indexOf('.yaml') != -1) {
        let data = YAML.stringify(req.body);
        fs.writeFileSync(__dirname + '/locales/' + req.params.collection, data);
    } else if (req.params.collection == 'sendPost') {
        let item = req.body;
        if(item.name && item.text) {
            let bxContactFilter = {

            };

            bxContactFilter[process.env.BX_LANG_FIELD] = 'ru';

            const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
                'filter': bxContactFilter,
                'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
            }));
            asyncForEach(bxContact.data.result, async user => {
                let text = `<b>${item.name}</b>\n\n${item.text}`;
                try {
                    if(item.file) {
                        await bot.telegram.sendPhoto(user[process.env.BX_CHAT_ID_FIELD], `${process.env.DOMAIN}${item.file}`, {
                            caption: sanitizeHtml(text, sanitizeOptions).replace(/\<br \/\>/g, "\n"),
                            parse_mode: 'HTML'
                        })
                    } else {
                        await bot.telegram.sendMessage(user[process.env.BX_CHAT_ID_FIELD], sanitizeHtml(text, sanitizeOptions).replace(/\<br \/\>/g, "\n"), { parse_mode: 'HTML' });
                    }

                } catch(e) {
                    console.log(e);
                }

            });
        }
        if(item.name_uz && item.text_uz) {
            let bxContactFilter = {

            };

            bxContactFilter[process.env.BX_CHAT_ID_FIELD] = 'uz';

            const bxContact = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.contact.list?' + serializeQuery({
                'filter': bxContactFilter,
                'select': ['*', process.env.BX_CHAT_ID_FIELD, process.env.BX_LANG_FIELD]
            }));
            asyncForEach(bxContact.data.result, async user => {
                let text = `<b>${item.name_uz}</b>\n\n${item.text_uz}`;
                try {
                    await bot.telegram.sendMessage(user[process.env.BX_CHAT_ID_FIELD], sanitizeHtml(text, sanitizeOptions).replace(/\<br \/\>/g, "\n"), { parse_mode: 'HTML' });
                } catch(e) {

                }
            });
        }
        await db.get('posts')
            .find({ id: item.id })
            .assign({ sent_date: new Date() })
            .write();
    } else if(req.params.collection == 'settings') {
        await db.get(req.params.collection)
            .assign(req.body)
            .write();
    } else {

        if(req.params.collection == 'products') {
            let fields = {
                NAME: req.body.name,
                PRICE: req.body.price
            };
            const bxProduct = await axios.get(process.env.BX_WEBHOOK_URL + 'crm.product.add?' + serializeQuery({
                fields
            }));
            req.body.product_id = bxProduct.data.result;
        }

        req.body.id = uuidv1();
        if(req.file) {
            req.body.file = `/uploads/${req.file.filename}`;
        }

        await db.get(req.params.collection)
            .push(req.body)
            .write();
    }

    return res.send({
        success: true
    });
});

app.delete('/api/:collection/:section_id/', async (req, res) => {
    if(req.params.section_id) {
        await db.get(req.params.collection)
            .remove({ id: req.params.section_id })
            .write();
    }
    return res.send({
        success: true
    });
});

app.put('/api/:collection/:section_id/', upload.single('file'), async (req, res) => {
    if(req.file) {
        req.body.file = `/uploads/${req.file.filename}`;
    }
    if(req.params.section_id) {
        await db.get(req.params.collection)
            .find({ id: req.params.section_id })
            .assign(req.body)
            .write();
    }
    return res.send({
        success: true
    });
});

app.use('/vue/', function(req, res, next){
    if ('POST' != req.method){
        next()
    }else{
        req.method = 'GET'
        next()
    }
})

app.use('/vue/', express.static('client/dist'));
// app.post('/vue/', express.static('client/dist'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    // console.log(req.get('host'));
    // console.log(req.get('origin'));
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    console.log(fullUrl);
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});



app.listen(process.env.APP_PORT, function(){
    console.log('App is started on port: ' + process.env.APP_PORT);
});

module.exports = app;