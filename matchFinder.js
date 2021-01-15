//discord module require
const Discord = require('discord.js');

//discord client
const client = new Discord.Client();

//other requireds
const config = require("./config.json");
const cron = require('node-cron');
var fs = require("fs");
const games = require("./games.json");
const admin = require("./admin.json");
const matches = require("./matches.json");
const teams = require("./teams.json");
const prefix = "!";
var numGames = 0;
var day;
const jSonId = 0;
const jSonName = 1;
const jSonDes = 2;
const jSonWeek = 3;
const jSonDate = 4;
const jSonStart = 5;
const jSonEnd = 6;

//Adds team to requested game queue (example: !overwatch -> adds coaches discord id to overwatch.json queue) 
//if date and time are valid and game exists.
function gameQ(message, call, name)
{
    var participants = JSON.parse(fs.readFileSync('matches.json', 'utf-8'));
    var gamePos = 0;
    for(var j = 0; j < participants.length; j++)
    {
        if(participants[j].id == call)
        {
            gamePos = j;
            for(var i = 0; i < Object.keys(participants[j]).length; i++)
            {
                const key = Object.keys(participants[j])[i];
                if(participants[gamePos][key] == message.member.user.id)
                {
                    message.channel.send("```diff\n- Your team is already queued.```");
                    return;
                }
            }
        }
    }
    //Check if team has competed before if not add to teams json

    var value = message.member;
    participants[gamePos][value] = message.member.user.id;
    fs.writeFile("matches.json", JSON.stringify(participants, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ Team added (" + message.member.user.username + ").```");
        }
    });
}

//Displays queue menu in discord channel where called
function helpCommand(message)
{
    var output = "```md";
    output += ("\n# Queue commands");
    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const des = Object.keys(games[i])[jSonDes];
        output += ("\n- <  " + prefix + games[i][id] + "  > " + games[i][des]);
    }
    
    if(games.length == 0) {
        output += "\nNo games have been added yet";
    }

    output += ("\n# Access Admin menu -> !admin");
    output += "\n```";
    message.channel.send(output);
}

//#region Admin Code

//Displays admin menu in discord channel where called
function adminMenu(message)
{
    var output = "```md";
    output += ("\n# Admin commands");
    for(var i = 0; i < admin.length; i++)
    {
        const id = Object.keys(admin[i])[1];
        const des = Object.keys(admin[i])[2];
        output += ("\n- < " + prefix + admin[i][id] + " > " + admin[i][des]);
    }
    
    output += "\n```";
    message.channel.send(output);
}

//Send out match notifications
function setMatches(game) {
    
}

//Clears all queues when called to
function clearQueues() {
    console.log("Clearing queues");
    numGames = games.length;
    for(var i = 0; i < numGames; i++)
    {
        const key = Object.keys(games[i])[0];
        var gameQueue = JSON.parse(fs.readFileSync(games[i][key] + '.json', 'utf-8'));
        //loops through each queue and removes any remaining team
        while(gameQueue.length >= 1)
        {
            gameQueue.splice(0, 1);
            fs.writeFile(games[i][key] + ".json", JSON.stringify([], null, 4), (err) =>
            {
                if (err)
                {
                    message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                    console.log(err);
                }
                else
                {
                    console.log("```diff\n+ Teams removed.```");
                }
            });
        }
    }
}

//Adds new game to list if it doesn't already exist by id, adds info to games.json and creates a matching json to store queued teams
function addGame(message, id, name) {
    if(name.length == 0) {
        message.channel.send("```diff\n- Error: Enter an id and game name. The id should have no spaces, the game name can have spaces.```");
        return;
    }
    //checks to see if game already exists (by id)
    for(var i = 0; i < games.length; i++)
    {
        const idKey = Object.keys(games[i])[0];
        console.log("id: " + id);
        console.log("other: " + games[i][idKey]);
        if(games[i][idKey] == id)
        {
            message.channel.send("```diff\n- Error: Game already exists.```");
            return;
        }
    }

    //if game doesn't exist create a file in games.json
    games.push(JSON.parse("{\"" + "id" + "\":\"" + id 
                            +"\", \n\"name\": \"" + name 
                            + "\", \n\"des\": \"" + "add description"
                            + "\", \n\"weekday\": \"" + "none"
                            + "\", \n\"date\": \"" + "none" 
                            + "\", \n\"start time\": \"" + "none" 
                            + "\", \n\"end time\": \"" + "none" + "\"}"));

    //update games.json with new games array file
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            //create json file for new game
            matches.push(JSON.parse("{\"" + "id" + "\":\"" + id + "\"}"));
            fs.writeFile('matches.json', JSON.stringify(matches, null, 4), (err) =>
            {
                if (err)
                {
                    message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                    console.log(err);
                }
                else {
                    console.log("game added");
                }
            });
            numGames = games.length;
            message.channel.send("```diff\n+ Game added (" + name + ").```");
        }
    });
}

//Remove game by id, removes game from games.json and deletes corresponding json file. 
//If id doesn't exist exits without removing anything
function removeGame(message, id) {
    var index = games.findIndex(a=> a.id === id);
    //if id is found remove game and update games.json
    if(index > -1) {
        games.splice(index, 1);
        fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
        {
            if (err)
            {
                message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                console.log(err);
            }
            else
            {
                message.channel.send("```diff\n+ " + id + " has been removed.```");
            }
        });
        index = matches.findIndex(a=> a.id === id);
        if(index > -1) {
            matches.splice(index, 1);
            fs.writeFile("matches.json", JSON.stringify(matches, null, 4), (err) =>
            {
                if (err)
                {
                    message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                    console.log(err);
                }
                else
                {
                    console.log("Queue removed");
                }
            });
        }
    }
    else {
        message.channel.send("```diff\n- " + id + " Error: does not exist in games list.```");
    }
    numGames = games.length;
}

//Add a description for listed game
function addDes(message, id, des) {
    if(des.length == 0){
        message.channel.send("```diff\n- Error: Enter a description. ```");
        return;
    }
    var index = games.findIndex(a=> a.id === id);
    games[index]["des"] = des;
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " description has been added/updated.```");
        }
    });
}

//Add a weekday (i.e. Sunday = 1, Monday = 2, etc.) for the queue to be available, none can be entered
function addWeekday(message, id, dayOfWeek) {
    var index = games.findIndex(a=> a.id === id);
    if(getWeekday((parseInt(dayOfWeek) - 1).toString()) == "Invalid") {
        message.channel.send("```diff\n- Error: invalid weekday, enter a number from 1 - 7, where 1 is Sunday.```");
        return;
    }
    games[index]["weekday"] = (dayOfWeek === "none") ? ("none" ) : (parseInt(dayOfWeek) - 1).toString();
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " weekly competition day has been added/updated.```");
        }
    });
}

//Add a specific date for queue to be available, none can be entered
function addDay(message, id, date) {

    if(date.length < 8 || date.length > 8 || isNaN(parseInt(date.substr(0,2))) || isNaN(parseInt(date.substr(2,2))) 
        || isNaN(parseInt(date.substr(4,4))) || parseInt(date.substr(0,2)) < 1 || parseInt(date.substr(0,2)) > 12 
        || parseInt(date.substr(2,2)) < 1 || parseInt(date.substr(2,2)) > 31 || parseInt(date.substr(4,4)) < 2020 
        || parseInt(date.substr(4,4)) > 9999) {
        message.channel.send("```diff\n- Error: Inputted date is not valid, please use a valid date in the format MMDDYYYY or none for no date, example: Jan 15, 2021 -> 01152021.```");
        return;
    }
    var index = games.findIndex(a=> a.id === id);
    games[index]["date"] = date;
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " competition date has been added/updated.```");
        }
    });
}

//Add start and end times for queue to be available, none can be entered for start, end or both for no restrictions
function addTime(message, id, start, end) {
    const startHr = parseInt(start.substr(0,2));
    const startMin = parseInt(start.substr(2,2));
    const endHr = parseInt(end.substr(0,2));
    const endMin = parseInt(end.substr(2,2));

    if(start.length < 4 || end.length < 4 || start.length > 4 || end.length > 4 || startHr < 0 || startHr > 23 
        || endHr < 0 || endHr >23 || startMin < 0 || startMin > 59 || endMin < 0 || endMin > 59 
        || isNaN(startHr) || isNaN(startMin) || isNaN(endHr) || isNaN(endMin)) {
        message.channel.send("```diff\n- Error: Inputted time is not valid, please use a valid time in the format HHMM or none for no time, example: 8:45 = 0845.```");
        return;
    }
    else if(parseInt(start) > parseInt(end)) {
        message.channel.send("```diff\n- Error: Start time cannot come after end time, please use a valid time in the format HHMM, example: 8:45 = 0845.```");
        return;
    }
    var index = games.findIndex(a=> a.id === id);
    games[index]["start time"] = start;
    games[index]["end time"] = end;
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " competition time has been added/updated.```");
        }
    });
}

//Outputs game details to discord, retrieved from games.json
function printDetails(message, id) {
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }
    gameName = games[index]["name"];
    var output = "```md";
    output += ("\n# " + gameName + " details");
    for(var i = 0; i < Object.keys(games[index]).length; i++)
    {
        const key = Object.keys(games[index])[i];
        if(key === "weekday") {
            var weekday = games[index][key];
            output += (weekday != "none") ? ("\n- < " + key + " > " + getWeekday(games[index][key])) 
                                        : ("\n- < " + key + " > " + games[index][key]);
        }
        else if(key === "date") {
            var date = games[index]["date"];
            output += (date != "none") ? ("\n- < " + key + " > " + date.substr(0,2) + "-" + date.substr(2,2) + "-" + date.substr(4))
                                        : ("\n- < " + key + " > " + date);
        }
        else if(key === "start time") {
            var startTime = games[index]["start time"];
            output += (startTime != "none") ? ("\n- < " + key + " > " + startTime.substr(0,2) + ":" + startTime.substr(2,2))
                                        : ("\n- < " + key + " > " + startTime);
        }
        else if(key === "end time") {
            var endTime = games[index]["end time"];
            output += (endTime != "none") ? ("\n- < " + key + " > " + endTime.substr(0,2) + ":" + endTime.substr(2,2))
                                        : ("\n- < " + key + " > " + endTime);
        }
        else
            output += ("\n- < " + key + " > " + games[index][key]);
    }
    
    output += "\n```";
    message.channel.send(output);
}

//#endregion

//Transforms weekday numerical to String for output
function getWeekday(number) {
    switch(number) {
        case "0":
            return "Sunday";
        case "1":
            return "Monday";
        case "2":
            return "Tuesday";
        case "3":
            return "Wednesday";
        case "4":
            return "Thursday";
        case "5":
            return "Friday";
        case "6":
            return "Saturday";
        case "none":
            return "none";
        default:
            return "Invalid";
    }
}

//checks if user is role to allow for commands
function hasPermission(message, role)
{
    if(message.member.roles.cache.find(r => r.name === role)) {
        console.log('Valid ' + role);
        return true;
    } 
    return false;
}

//add team to queue if the time/date conditions are met
function addToQueue(message, id, game) {
    //Get game info
    day = new Date();
    var game;
    const gameName = games[game]["name"];
    const dayKey = Object.keys(games[game])[jSonWeek];
    const nameKey = Object.keys(games[game])[jSonName];
    const dateKey = Object.keys(games[game])[jSonDate];
    const startTimeKey = Object.keys(games[game])[jSonStart];
    const endTimeKey = Object.keys(games[game])[jSonEnd];
    
    var currentTime = parseInt(day.getHours() + "" + day.getMinutes());
    
    var weekday = (games[game][dayKey] != "none") ? (parseInt(games[game][dayKey])) : (games[game][dayKey]);
    var date = (games[game][dateKey] != "none") ? (parseInt(games[game][dateKey])) : (games[game][dateKey]);

    var dateMonth;
    var dateDay;
    var dateYear;
    var startTime = (games[game][startTimeKey] != "none") ? (parseInt(games[game][startTimeKey])) : (games[game][startTimeKey]);
    var endTime = (games[game][endTimeKey] != "none") ? (parseInt(games[game][endTimeKey])) : (games[game][endTimeKey]);

    if(date != "none") {
        dateMonth = parseInt(games[game][dateKey].substr(0,2));
        dateDay = parseInt(games[game][dateKey].substr(2,2));
        dateYear = parseInt(games[game][dateKey].substr(4,4));
    }
    
    //Checks if weekday or date has been set, then checks time to make sure currentTime is valid to join queue
    if((weekday === "none" && date === "none") 
        || weekday == day.getDay()
        || (day.getMonth() + 1 == dateMonth && day.getDate() == dateDay && day.getFullYear() == dateYear)) {
        if((currentTime >= startTime && currentTime <= endTime) 
            || (startTime === "none" && currentTime <= endTime) 
            || (currentTime >= startTime && endTime === "none")
            || (startTime === "none" && endTime === "none")) {
                gameQ(message, games[game][id], games[game][nameKey]);
        }
        else {
            var messageTxt = (startTime != "none" && endTime != "none") ? 
                ("```diff\n- Queue time for " + gameName + " starts at " + startTime + " and ends at " + endTime + "```") :
                (startTime != "none") ? ("```diff\n- Queue time for " + gameName + " starts at " + startTime + "```") :
                ("```diff\n- Queue time for " + gameName + " ended at " + endTime + "```");
            message.channel.send(messageTxt);
            return;
        }
    }
    //One or more of the conditions have not been met, output queue window to clarify availability to user
    else
    {
        var messageTxt = (weekday === "none" && startTime != "none" && endTime != "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " from " + startTime + " to " + endTime + "```") :

                    (weekday === "none" && startTime === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + "```") :
                    
                    (weekday === "none" && startTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " until " + endTime + "```") :

                    (weekday === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " starting at " + startTime + "```") :

                    (endTime === "none" && startTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s```"):

                    (startTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s until " + endTime + "```") :

                    (endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s starting at " + startTime + "```"):


                    ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s from " + startTime + " to " + endTime + "```");

        message.channel.send(messageTxt);
        return;
    }
}

//connection ready
client.on('ready', (evt) => {
    console.log("Connected");
    numGames = games.length;
    let scheduledMessage = new cron.schedule('00 00 20 * * *', () => {
    // This runs every day at 18:00:00 to clear all queues
        //clearQueues();
        //send out match notifications at 3pm
        console.log("Queues cleared");
    });
    scheduledMessage.start()
});

//processes input
client.on('message', message => {
    //exit if message doesn't begin with !
    if (!message.content.startsWith(prefix) || message.author.bot)
    {
        return;
    }
    const args = message.content.slice(prefix.length).split(/ +/);
    const call = args.shift().toLowerCase();
    var id;
    var command;
    let found = false;
    let adminFound = false;

    //Checks that game id exits (for queue commands)
    for(var i = 0; i < games.length; i++)
    {
        id = Object.keys(games[i])[jSonId];
        if(games[i][id] === call)
        {
            game = i;
            found = true;
            break;
        }
    }

    //checks that admin command exists (for admin commands)
    for(var i = 0; i < admin.length; i++)
    {
        command = Object.keys(admin[i])[0];
        if(admin[i][command] === call)
        {
            adminCommand = i;
            adminFound = true;
            break;
        }
    }

    //console.log("call: " + call);
    //console.log("args: " + args);

    if(call === "help") {   //calls to help menu display
        helpCommand(message);
    }
    else if (call == "admin") { //checks if user has admin privileges, if does calls to admin menu display
        if (!hasPermission(message, "@admin"))
        {
            message.channel.send("```diff\n- You must be an admin to use admin commands.```");
            return;
        }
        adminMenu(message);
    }
    else if(adminFound) { //checks if user has admin privileges, if does processes command
        if (!hasPermission(message, "@admin"))
        {
            message.channel.send("```diff\n- You must be an admin to use admin commands.```");
            return;
        }
        switch (call) {
            case "add":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addGame(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "remove":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                removeGame(message, args.shift().toLowerCase());
                break;
            case "des":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addDes(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "weekday":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addWeekday(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "date":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addDay(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "time":
                if(args.length < 3){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addTime(message, args.shift().toLowerCase(), args.shift(), args.join(" "));
                break;
            case "print":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                printDetails(message, args.shift().toLowerCase());
                break;
        }
    }
    else if(found) { //checks if user has School Coach privileges, if does processes queue commands
        if (!hasPermission(message, "School Coach"))
        {
            message.channel.send("```diff\n- You must be a School Coach to join a queue.```");
            return;
        }
        addToQueue(message, id, game);
    }
    else { //Entered command was invalid
        message.channel.send("```diff\n- Invalid Input ```");
        return;
    }
});

client.login(config.BOT_TOKEN);

//Shuts down bot
function shutdown()
{
    console.log("Shutting Bot Down");
    discordClient.destroy();
}
