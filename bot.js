import { Telegraf } from 'telegraf';
import { Client } from "@hubspot/api-client";
import { config } from "dotenv";
config();

import { Configuration, OpenAIApi } from "openai";

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.API_KEY
}))

const hubspotClient = new Client({ accessToken: 'pat-eu1-e56be939-433d-4d71-9835-0b44fb881a4e' });
let response = await hubspotClient.apiRequest({
    method: 'get',
    //path: '/crm/v3/objects/tasks',
    path: '/crm/v3/objects/tickets',

});

let json = await response.json();
const bot = new Telegraf('6108561206:AAEOrpUvlSP7ar8dCK3zBk1J47JVVr-U6NY');

//code
bot.start((ctx) =>  {
    ctx.reply('Welcome to the PSF Telegram Bot powered by AI');
});

//OPEN AI
bot.on('text', async (ctx) => {
    const res = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: ctx.message.text }],
    });

    //content of reply
        ctx.reply(res.data.choices[0].message.content);
});

bot.on('voice', async (ctx) => {
    console.log(ctx.message);
})

//retrieve Tickets list from Hubspot and put onto Telegram
bot.hears('/tasks', async (ctx) => {
    //API Request for Ticket JSON
    response = await hubspotClient.apiRequest({
        method: 'get',
        path: '/crm/v3/objects/tickets',
        
    });
    json = await response.json();
    
    let ticketArr = [];
    for (let i = 0; i < json.results.length; i++) {
        //convert ticket Date -> Sydney Time Zone Date
        let hubDate = json.results[i].createdAt;
        let sydDate = convertTimeZone(convertToUSDateFormat(hubDate), "Australia/Sydney");

        //compare converted date of ticket to today's date
        if (ifDateIsToday(sydDate)) {
            //store tickets for today in array
            ticketArr.push(json.results[i].properties.subject);
        }
    }

    //message list of tickets through bot
    let finalString = ticketArr.join('\r\n');
    ctx.reply("Here are all outstanding tickets for today: \n\n" + finalString);
});

function convertTimeZone(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));
} 

function ifDateIsToday(date) {
    let today = new Date();
    if (date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear()) {
        return true;
    }
    return false;
}

//convert hubspot createdAt date to enUS date format
function convertToUSDateFormat(date) {
    let tempArray = date.split("-");
    let year = tempArray[0];
    let month = tempArray[1];
    let day = tempArray[2].slice(0,2);
    let time = tempArray[2].slice(3,11);

    return year + "/" + month + "/" + day +" " + time + " -01:00";
}

bot.launch(0);