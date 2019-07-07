var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const Telegraf = require('telegraf');
const TelegrafI18n = require('telegraf-i18n');
const { match, reply } = require('telegraf-i18n');
const Markup = require('telegraf/markup');

const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const WizardScene = require("telegraf/scenes/wizard");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

const DirectusSDK = require("@directus/sdk-js");

const client =  new DirectusSDK({
    url: "http://public/public",
    project: "_",
    token: "1531321321"
});

async function fetchAllItems() {
    const data = await client.getItems("users");
    return data;
}
fetchAllItems();

const i18n = new TelegrafI18n({
    defaultLanguage: 'ru',
    allowMissing: false, // Default true
    directory: path.resolve(__dirname, 'locales')
});

const bot = new Telegraf('839817860:AAEFPJrAVJJvgRAq6c7_7GuomWlQiYIgNu8');
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
            },
            single: true
        });

        if(!user.data) {
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
        if(ctx.message.text === "🇺🇿 O'zbekcha") {
            lang = 'uz';
        }
        const chat = await ctx.getChat();
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        if(user) {
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
        if(user) {
            await client.updateItem("users", user.data.id, {
                first_name: ctx.message.text
            });
        }
        ctx.i18n.locale(user.data.lang);

        // await client.put('/accounts/' + dbUser.userId, { first_name: ctx.message.text });

        ctx.reply(ctx.i18n.t('get_phone'), { reply_markup: { keyboard: [[{text: '📲 Send phone number', request_contact: true}]]}});
        // ctx.reply(ctx.i18n.t('get_phone'));
        return ctx.wizard.next(); // Переходим к следующему обработчику.
    },
    async (ctx) => {
        const chat = await ctx.getChat();
        let phoneNumber = ctx.message.text;
        if(ctx.message.contact) {
            phoneNumber = ctx.message.contact.phone_number;
        }
        const user = await client.getItems('users', {
            filter: {
                chat_id: chat.id
            },
            single: true
        });
        if(user) {
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
                    m.callbackButton('/start'),
                ]
            ]).resize());
        const contacts = await client.getItems("contacts");
        const obcontacts = [
            'Адрес: ' + contacts.data[0].address,
            'Ориентир ' + contacts.data[0].reference_point,
            'Режим работы ' + contacts.data[0].operation_mode,
            'Связаться с нами можно по номеру : ' + contacts.data[0].phone_number
        ];
        ctx.reply(ctx.i18n.t('select_an_action'), aboutMenu);
        bot.hears(ctx.i18n.t('button_contacts'), (ctx) => ctx.reply(obcontacts.join()));
        return ctx.scene.leave();
    }
);

// Создаем менеджера сцен
const stage = new Stage();

// Регистрируем сцену создания матча
stage.register(create);

bot.use(session());
bot.use(stage.middleware());
bot.action("create", (ctx) => ctx.scene.enter("create"));
bot.start((ctx) => ctx.scene.enter("create"));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.scene.enter("create"));

bot.hears('button_catalog', (ctx) => {
    const cat = client.getItems('category');

    const catMenu = Telegraf.Extra
        .markdown()
        .markup((m) => m.keyboard([
            [
                m.callbackButton(cat.data.name),
                m.callbackButton(ctx.i18n.t('button_catalog')),
            ],
            [
                m.callbackButton(ctx.i18n.t('button_stock')),
                m.callbackButton(ctx.i18n.t('button_review')),
            ]
        ]).resize());

    return ctx.reply(catMenu);
});



bot.launch();



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
