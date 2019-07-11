var createError = require('http-errors');
require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const Telegraf = require('telegraf');
const TelegrafI18n = require('telegraf-i18n');
const Router = require('telegraf/router');
const {match, reply} = require('telegraf-i18n');
const Markup = require('telegraf/markup');

const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const WizardScene = require("telegraf/scenes/wizard");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

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

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
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
                    text: '📲 Send phone number',
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

        Object.defineProperty(Array.prototype, 'chunk_inefficient', {
            value: function(chunkSize) {
                var array = this;
                return [].concat.apply([],
                    array.map(function(elem, i) {
                        return i % chunkSize ? [] : [array.slice(i, i + chunkSize)];
                    })
                );
            }
        });
        const catMenu = Telegraf.Extra
            .markdown()
            .markup((m) => {
                let menu = [];
                menuCategories.forEach(function (item) {
                    menu.push(m.callbackButton(item.name, 'product:' + item.id));
                });
                return m.keyboard(menu.chunk_inefficient(3)).resize();
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
        let categoryName = ctx.message.text;
        let category = '';
        if(user.data.lang == 'uz') {
            category = await client.getItems('category', {
                filter: {
                    name_uz: categoryName
                }
            });
        } else {
            category = await client.getItems('category', {
                filter: {
                    name_uz: categoryName
                }
            });
        }

        if(!category.data.length) {
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
                return m.keyboard(menu.chunk_inefficient(3)).resize();
            });
        ctx.reply(ctx.i18n.t('choose_category_product'), catMenu);
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.i18n.t('back')) {
            return ctx.wizard.selectStep(ctx.wizard.cursor - 2);
        }
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
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
            .markup((m) => m.removeKeyboard());
        ctx.reply(ctx.i18n.t('send_review'), aboutMenu);
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
        await client.createItem("reviews", {
            user_id:  user.data.id,
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
                ]
            ]).resize());

        ctx.reply(ctx.i18n.t('thanks_review'), aboutMenu);
        return ctx.scene.leave();
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
        return ctx.scene.leave();
    },
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
            .markup((m) => m.removeKeyboard());
        ctx.reply(ctx.i18n.t('enter_your_name'), settingsMenu);
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
        let editedName = ctx.message.text;
        if (ctx.i18n.t('edit_fio')) {
            const chat = await ctx.getChat();
            const user = await client.getItems('users', {
                filter: {
                    chat_id: chat.id
                },
                single: true
            });
            if (user) {
                await client.updateItem("users", user.data.id, {
                    first_name: editedName
                });
            }
        }
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
            .markup((m) => m.removeKeyboard());
        ctx.reply(ctx.i18n.t('enter_your_phone'), settingsMenu);
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
        let editedPhone = ctx.message.text;
        if (user) {
            await client.updateItem("users", user.data.id, {
                phone: editedPhone
            });
        }
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
        return ctx.scene.leave();
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

bot.use(session());
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
    return ctx.reply(arrcontacts.join(''))
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
}

bot.hears('📱 Контактная информация', getContactsInfo);
bot.hears('📱 Aloqa ma\'lumotlari', getContactsInfo);
bot.hears('📝 Оставить отзыв', (ctx) => ctx.scene.enter("review"));
bot.hears('📝 Fikr qoldirish', (ctx) => ctx.scene.enter("review"));
bot.hears('📋 Mahsulotlar katalogi', (ctx) => ctx.scene.enter("catalog"));
bot.hears('📋 Каталог товаров', (ctx) => ctx.scene.enter("catalog"));
bot.hears('⚙️ Настройки', (ctx) => ctx.scene.enter("settings"));
bot.hears('⚙️ Sozlamalar', (ctx) => ctx.scene.enter("settings"));
bot.hears('Изменить ФИО', (ctx) => ctx.scene.enter("editFio"));
bot.hears('FIO ni o\'zgartirish', (ctx) => ctx.scene.enter("editFio"));
bot.hears('Изменить номер', (ctx) => ctx.scene.enter("editNumber"));
bot.hears('Raqamni o\'zgartirish', (ctx) => ctx.scene.enter("editNumber"));
bot.hears('🏷 Акции', getStock);
bot.hears('🏷 Aktsiyalar', getStock);
bot.action(/.+/, (ctx) => {
    console.log(ctx.match);
    return ctx.answerCbQuery(`Oh, ${ctx.match[0]}! Great choice`);
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