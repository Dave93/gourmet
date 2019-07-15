var createError = require('http-errors');
require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var app = express();

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
const client = new DirectusSDK({
    url: process.env.SHOP_API_URL,
    project: "_",
    token: "1531321321"
});
const i18n = new TelegrafI18n({
    defaultLanguage: 'ru',
    allowMissing: false, // Default true
    directory: path.resolve(__dirname, 'locales')
});

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

        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            }
        });

        if (!user.data.length) {
            await client.createItem("users", {
                first_name: chat.first_name,
                last_name: '',
                phone: '',
                chat_id: chat.id,
                lang: ''
            });
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
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        if (user) {
            await client.updateItem("users", user.data.id, {
                lang
            });
        }
        ctx.i18n.locale(lang);
        ctx.reply(ctx.i18n.t('get_name'), aboutMenu);
        return ctx.wizard.next(); // Переходим к следующему обработчику.
    },
    async (ctx) => {

        const chat = await ctx.getChat();
        // const dbUser = await db.findOne({ chat_id: chat.id });
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        if (user) {
            await client.updateItem("users", user.data.id, {
                first_name: ctx.message.text
            });
        }
        ctx.i18n.locale(user.data.lang);

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
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        if (user) {
            await client.updateItem("users", user.data.id, {
                phone: phoneNumber
            });
        }
        ctx.i18n.locale(user.data.lang);
        const aboutMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                [
                    m.callbackButton(ctx.i18n.t('button_catalog'))
                ],
                [
                    m.callbackButton(ctx.i18n.t('button_contacts')),
                    m.callbackButton(ctx.i18n.t('settings')),
                ],
                [
                    m.callbackButton(ctx.i18n.t('button_stock')),
                    m.callbackButton(ctx.i18n.t('button_review')),
                ],
            ]).resize());

        ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);
        return ctx.scene.leave();
    }
);

const catalogScene = new WizardScene(
    'catalog',
    async (ctx) => {
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
        const cat = await client.getItems('category');
        let menuCategories = [];
        cat.data.forEach(item => {
            let name = 'name';
            if (user.data.lang == 'uz') {
                name = 'name_uz';
            }
            menuCategories.push({
                name: item[name],
                id: item.id
            });
        });

        const catMenu = Telegraf.Extra
            .markdown()
            .markup((m) => {
                let menu = [];
                menu.push(m.callbackButton(ctx.i18n.t('back')));
                menuCategories.forEach(function (item) {
                    menu.push(m.callbackButton(item.name));
                });
                return m.keyboard(menu.length ? menu.chunk_inefficient(3) : []).resize();
                //chunk_inefficient(3) разделения кнопки
            });

        ctx.reply(ctx.i18n.t('choose_catalog_category'), catMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
        // if (ctx.message.text == ctx.i18n.t('back')) {
        //     ctx.scene.leave();
        //     const aboutMenu = Telegraf.Extra
        //         .markdown()
        //         .markup((m) => m.keyboard([
        //             [
        //                 m.callbackButton(ctx.i18n.t('button_catalog'))
        //             ],
        //             [
        //                 m.callbackButton(ctx.i18n.t('button_contacts')),
        //                 m.callbackButton(ctx.i18n.t('settings')),
        //             ],
        //             [
        //                 m.callbackButton(ctx.i18n.t('button_stock')),
        //                 m.callbackButton(ctx.i18n.t('button_review')),
        //             ],
        //         ]).resize());
        //
        //     return ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);
        // }

        let categoryName = ctx.message.text;
        let category = '';
        if (user.data.lang == 'uz') {
            category = await client.getItems('category', {
                filter: {
                    name_uz: categoryName
                }
            });
        } else {
            category = await client.getItems('category', {
                filter: {
                    name: categoryName
                }
            });
        }

        if (!category.data.length) {
            ctx.reply(ctx.i18n.t('catalog_category_not_found'));
            return ctx.wizard.back();
        }

        ctx.scene.session.categoryId = category.data[0].id;

        const cat = await client.getItems('products', {
            filter: {
                category: category.data[0].id
            }
        });
        let menuProducts = [];
        cat.data.forEach(item => {
            let name = 'name';
            if (user.data.lang == 'uz') {
                name = 'name_uz';
            }
            menuProducts.push({
                name: item[name],
                id: item.id
            });
        });

        const catMenu = Telegraf.Extra
            .markdown()
            .markup((m) => {
                let menu = [m.callbackButton(ctx.i18n.t('back'))];
                menuProducts.forEach(function (item) {
                    menu.push(m.callbackButton(item.name, 'product:' + item.id));
                });
                return m.keyboard(menu.length ? menu.chunk_inefficient(3) : []).resize();
            });
        ctx.reply(ctx.i18n.t('choose_category_product'), catMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
        if (ctx.message.text == ctx.i18n.t('back')) {
            ctx.scene.leave();
            return ctx.scene.enter('catalog');
        } else {
            const countMenu = Telegraf.Extra
                .HTML()
                .markup((m) => m.keyboard([
                    ['1', '2', '3'],
                    ['4', '5', '6'],
                    ['7', '8', '9'],
                    [ctx.i18n.t('back')]
                ]).resize());

            return ctx.reply(ctx.i18n.t('select_an_action'), countMenu);
        }
        let productName = ctx.message.text;
        let product = '';
        console.log(ctx.scene.session.categoryId);
    }
);

const reviewScene = new WizardScene(
    'review',
    async (ctx) => {
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
        const aboutMenu = Telegraf.Extra
            .markdown()
            .markup((m) => m.keyboard([
                [ctx.i18n.t('back')]
            ]).resize());
        ctx.reply(ctx.i18n.t('send_review'), aboutMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text == ctx.i18n.t('back')) {
            return ctx.scene.enter("settings");
        } else {
            const chat = await ctx.getChat();
            const user = await client.getItems('users', {
                filter: {
                    chat_id: chat.id
                },
                single: true
            });
            ctx.i18n.locale(user.data.lang);
            await client.createItem("reviews", {
                user_id: user.data.id,
                review_text: ctx.message.text
            });

            const aboutMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.keyboard([
                    [
                        m.callbackButton(ctx.i18n.t('button_contacts')),
                        m.callbackButton(ctx.i18n.t('button_catalog')),
                    ],
                    [
                        m.callbackButton(ctx.i18n.t('button_stock')),
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
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
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
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
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
                            m.callbackButton(ctx.i18n.t('settings')),
                        ],
                        [
                            m.callbackButton(ctx.i18n.t('button_stock')),
                            m.callbackButton(ctx.i18n.t('button_review')),
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
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
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
            const user = await client.getItems('users', {
                filter: {
                    chat_id: chat.id
                },
                single: true
            });
            ctx.i18n.locale(user.data.lang);
            let editedName = ctx.message.text;
            if (user) {
                await client.updateItem("users", user.data.id, {
                    first_name: editedName
                });
            }
            ctx.scene.enter("settings");
        }
        return ctx.scene.leave();
    },
);


const editNumberScene = new WizardScene(
    'editNumber',
    async (ctx) => {
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        ctx.i18n.locale(user.data.lang);
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
            const user = await client.getItems('users', {
                filter: {
                    chat_id: chat.id
                },
                single: true
            });
            ctx.i18n.locale(user.data.lang);
            if (user) {
                await client.updateItem("users", user.data.id, {
                    phone: editedPhone
                });
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
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        if (user) {
            await client.updateItem("users", user.data.id, {
                lang
            });
        }
        ctx.i18n.locale(lang);
        return ctx.scene.enter("settings");
    },
);

// Создаем менеджера сцен
const stage = new Stage();

// Регистрируем сцену создания матча
stage.register(create);
stage.register(catalogScene);
stage.register(reviewScene);
stage.register(settingsScene);
stage.register(editFioScene);
stage.register(editNumberScene);
stage.register(changeLanguageScene);

bot.catch((err) => {
    console.log('Ooops', err)
});
bot.use((new LocalSession({database: 'example_db.json'})).middleware());
bot.use(stage.middleware());
bot.action("create", (ctx) => ctx.scene.enter("create"));
bot.start((ctx) => ctx.scene.enter("create"));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.scene.enter("create"));

const getCatalogInfo = async (ctx) => {
    console.log('davr');
    const chat = await ctx.getChat();
    const user = await client.getItems('users', {
        filter: {
            chat_id: chat.id
        },
        single: true
    });
};

const getContactsInfo = async (ctx) => {
    const contacts = await client.getItems("contacts");
    const arrcontacts = [
        'Адрес: ' + contacts.data[0].address + '\n',
        'Ориентир: ' + contacts.data[0].reference_point + '\n',
        'Режим работы: ' + contacts.data[0].operation_mode + '\n',
        'Связаться с нами можно по номеру: ' + contacts.data[0].phone_number
    ];
    try {
        return ctx.reply(arrcontacts.join(''));
    } catch (e) {

    }

};

const getStock = async (ctx) => {
    const chat = await ctx.getChat();
    const user = await client.getItems('users', {
        filter: {
            chat_id: chat.id
        },
        single: true
    });
    ctx.i18n.locale(user.data.lang);
    const stock = await client.getItems('stock', {
        fields: 'stock'
    });
    if (stock.data[0]) {
        ctx.reply(stock.data[0].stock, {parse_mode: "HTML"});
    } else {
        ctx.reply(ctx.i18n.t('no_stock'));
    }
};

const getCatalog = async ctx => {
    const chat = await ctx.getChat();
    const user = await client.getItems('users', {
        filter: {
            chat_id: chat.id
        },
        single: true
    });
    ctx.i18n.locale(user.data.lang);
    const cat = await client.getItems('category');
    let menuCategories = [];
    cat.data.forEach(item => {
        let name = 'name';
        if (user.data.lang == 'uz') {
            name = 'name_uz';
        }
        menuCategories.push({
            name: item[name],
            id: item.id
        });
    });
    let menu = [];
    menuCategories.forEach(function (item) {
        menu.push(Markup.callbackButton(item.name, 'category:' + item.id));
    });
    const catMenu = Markup.inlineKeyboard(menu.length ? menu.chunk_inefficient(3) : []).extra();
    return ctx.reply(ctx.i18n.t('choose_catalog_category'), catMenu);
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
bot.action(/.+/, async (ctx) => {
    console.log(ctx.match);
    let input = ctx.match.input.split(':');
    const chat = await ctx.getChat();
    const user = await client.getItems('users', {
        filter: {
            chat_id: chat.id
        },
        single: true
    });
    ctx.i18n.locale(user.data.lang);
    switch (input[0]) {
        case 'category':
            if(parseInt(input[1], 0) > 0) {
                const categoryId = input[1];
                // const category = await client.getItems('category', {
                //     filter: {
                //         id: categoryId
                //     }
                // });

                // if (!category.data.length) {
                //     ctx.reply(ctx.i18n.t('catalog_category_not_found'));
                //     return ctx.wizard.back();
                // }

                ctx.scene.session.categoryId = categoryId;

                const cat = await client.getItems('products', {
                    filter: {
                        category: categoryId
                    }
                });
                let menuProducts = [];
                cat.data.forEach(item => {
                    let name = 'name';
                    if (user.data.lang == 'uz') {
                        name = 'name_uz';
                    }
                    menuProducts.push({
                        name: item[name],
                        id: item.id
                    });
                });

                let menu = [];
                menuProducts.forEach(function (item) {
                    menu.push(Markup.callbackButton(item.name, 'product:' + item.id))
                });
                return ctx.editMessageText(ctx.i18n.t('choose_category_product'), Markup.inlineKeyboard(menu.length ? menu.chunk_inefficient(3) : []).extra());
            }
        break;
        case 'product':
            if(input[1] == 'count') {
                const productId = input[2];
                const count = input[3];
                const userId = user.data.id;
                console.log(ctx);


            } else if(parseInt(input[1], 0) > 0) {
                const productId = input[1];
                ctx.scene.session.productyId = productId;
                return ctx.editMessageText(
                    ctx.i18n.t('product_count_text'),
                    Markup.inlineKeyboard(
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
                                Markup.callbackButton(ctx.i18n.t('back'), ctx.i18n.t('back')),
                                Markup.callbackButton(ctx.i18n.t('all_categories'), ctx.i18n.t('back'))
                            ],
                        ]
                    ).extra()
                );
            }
        break;
    }

    // return ctx.answerCbQuery(`Oh, ${ctx.match[0]}! Great choice`);
});
bot.launch();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
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

module.exports = app;