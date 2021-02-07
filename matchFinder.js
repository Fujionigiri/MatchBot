//discord module require
const Discord = require('discord.js');

//discord client
const client = new Discord.Client();

//other requireds
const config = require("./config.json");
const cron = require('node-cron');
var cronJobs = [];
var fs = require("fs");
var path = require("path");
const games = require("./games.json");
const admin = require("./admin.json");
const matches = require("./matches.json");
const teams = require("./teams.json");
const matchLog = require("./matchLog.json");
const prefix = "!";
var numGames = 0;
var day;
var currentWeekDay;
var currentDay;
var currentMonth;
var currentYear;
var currentHour;
var currentMinutes;
const jSonId = 0;
const jSonName = 1;
const jSonChannel = 2;
const jSonDes = 3;
const jSonMaxTeams = 4;
const jSonWeek = 5;
const jSonDate = 6;
const jSonQueue = 7;
const jSonStart = 8;
const jSonEnd = 9;

//Adds team to requested game queue (example: !overwatch 3 -> adds coaches discord id to matches.json overwatch queue under 3 teams) 
//if date and time are valid and game exists.
function gameQ(message, call, name, numTeams)
{
    console.log("directory: " + __dirname);
    var participants = JSON.parse(fs.readFileSync('/matches.json', 'utf-8'));
    var gamePos = 0;
    var teamNumbers = "teams " + numTeams;
    for(var j = 0; j < participants.length; j++)
    {
        if(participants[j].id == call)
        {
            gamePos = j;
            for(var i = 0; i < Object.keys(participants[j]).length; i++)
            {
                const key = Object.keys(participants[gamePos])[i];
                
                var teams = participants[gamePos][key];
                for(var k = 0; k < Object.keys(teams).length; k++)
                {
                    const key = Object.keys(teams)[k];
                    if(teams[key] == message.member.user.id)
                    {
                        message.channel.send("```diff\n- Your team is already queued.```");
                        return;
                    }
                }
            }
        }
    }
    //Check if team has competed before if not add to teams json
    
    var value = message.member.user.id;
    if(participants[gamePos][teamNumbers] == null) {
        participants[gamePos][teamNumbers] = JSON.parse("{}");
    }
    
    participants[gamePos][teamNumbers][value] = message.member.user.id;
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
            getCurrentMatches();
        }
    });
}

//checks through games array to find tournaments that are currently in progress
function getCurrentMatches() {
    //get current date
    var participants = JSON.parse(fs.readFileSync('/matches.json', 'utf-8'));
    var log = JSON.parse(fs.readFileSync('/matchLog.json', 'utf-8'));
    var completeDate = (currentMonth < 10) ? (currentDay < 10 ? "0" + currentMonth.toString() + "0" + currentDay.toString() + currentYear.toString()
                                                                : "0" + currentMonth.toString() + currentDay.toString() + currentYear.toString())
                                                                : currentMonth.toString() + currentDay.toLowerCase() + currentYear.toString();
    var channelID = config.MAIN_CHANNEL;
    //scroll through game json and find all games with current day of the week or current date

    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const dayKey = Object.keys(games[i])[jSonWeek];
        const dateKey = Object.keys(games[i])[jSonDate];
        const startTimeKey = Object.keys(games[i])[jSonStart];
        const endTimeKey = Object.keys(games[i])[jSonEnd];
        var startHr="";
        var startMin="";
        var startTime = 0;
        var endHr="";
        var endMin="";
        endTime = 0;
        
        var currentTime = (currentMinutes < 10) ? parseInt(currentHour.toString() + "0" + currentMinutes.toString()):
                                                    parseInt(currentHour.toString() + currentMinutes.toString());
        var weekday = (games[i][dayKey] != "none") ? (parseInt(games[i][dayKey])) : (games[i][dayKey]);
        var date = (games[i][dateKey] != "none") ? (parseInt(games[i][dateKey])) : (games[i][dateKey]);
        var dateMonth="";
        var dateDay="";
        var dateYear="";
        if(games[i][startTimeKey] != "none") {
            startHr = games[i][startTimeKey].substr(0,2);
            startMin = games[i][startTimeKey].substr(2,2);
            startTime = parseInt(startHr + startMin);
        }
        if(games[i][endTimeKey] != "none") {
            endHr = games[i][endTimeKey].substr(0,2);
            endMin = games[i][endTimeKey].substr(2,2);
            endTime = parseInt(endHr + endMin);
        }
        if(date != "none") {
            dateMonth = parseInt(games[i][dateKey].substr(0,2));
            dateDay = parseInt(games[i][dateKey].substr(2,2));
            dateYear = parseInt(games[i][dateKey].substr(4,4));
        }

        //add cron job to release matches at game's specified start time
        if((weekday === currentWeekDay || 
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)) 
            && games[i][startTimeKey] != "none")
        {
            if(currentTime >= startTime && currentTime <= endTime){
                setMatches(games[i][id], participants, completeDate, log);
            }
        }
        //if start time hasn't been set the matches are released at noon
        else if((weekday === currentWeekDay ||
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear))
             && games[i][startTimeKey] === "none")
        {
            setMatches(games[i][id], participants, completeDate, log);
        }
        //if no date or day of week has been set then adds cron job as specified game start time
        else if(weekday === "none" && date === "none" && games[i][startTimeKey] != "none") {
            setMatches(games[i][id], participants, completeDate, log);
        }
        else if(weekday === "none" && date === "none" && games[i][startTimeKey] === "none") {
            setMatches(games[i][id], participants, completeDate, log);
        }
    }
    fs.writeFile("matches.json", JSON.stringify(participants, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            //client.channels.cache.get(channelID).send("```diff\n+ Teams Matched.```");
        }
    });
    fs.writeFile('matchLog.json', JSON.stringify(log, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
    });

    //add each game's start time to the cron job as long as the start time isn't "none"
    
    //if current time is >= start time, call to setMatches(gameId)
}

//Send out match notifications
function setMatches(gameId, participants, completeDate, log) {
    
    var gamePos = 0;
    var channel = "";
    
    for(var j = 0; j < participants.length; j++)
    {
        if(participants[j].id == gameId)
        {
            for(var k = 0; k < games.length; k++)
            {
                if(games[k].id == gameId){
                    var channelKey = Object.keys(games[gamePos])[jSonChannel];
                    channel = (games[k][channelKey] != "none") ? (games[k][channelKey]) : config.MAIN_CHANNEL;
                }
            }
            gamePos = j;
            break;
        }
    }
    var gameLogPos = 0;
    for(var j = 0; j < log.length; j++)
    {
        if(log[j].id == gameId)
        {
            gameLogPos = j;
        }
    }

    for(var i = 1; i < Object.keys(participants[gamePos]).length; i++)
    {
        const key = Object.keys(participants[gamePos])[i];
        
        var teams = participants[gamePos][key];
        
        while (Object.keys(participants[gamePos][key]).length > 1)
        {
            var team1Pos = Math.floor(Math.random() * Object.keys(participants[gamePos][key]).length);
            let team1 = Object.keys(participants[gamePos][key])[team1Pos];
            delete participants[gamePos][key][team1];
            var team2Pos = Math.floor(Math.random() * Object.keys(teams).length)
            let team2 = Object.keys(participants[gamePos][key])[team2Pos];
            delete participants[gamePos][key][team2];
            client.channels.cache.get(channel).send("<@" + team1 + ">" + " " +  "<@" + team2 + "> set up match for " + gameId + ".");
            if(log[gamePos][completeDate] == null) {
                log[gamePos][completeDate] = JSON.parse("{}");
            }
            if(log[gamePos][completeDate][key] == null) {
                log[gamePos][completeDate][key] = JSON.parse("{}");
            }
            var matchSets = log[gameLogPos][completeDate][key];

            log[gameLogPos][completeDate][key]["match" + Object.keys(matchSets).length] = team1 + " " + team2;
        }
    }
}

//Clears all queues when called to
function clearQueues() {
    console.log("Clearing queues");
    var participants = JSON.parse(fs.readFileSync('/matches.json', 'utf-8'));
    for(var j = 0; j < participants.length; j++)
    {
        for(var i = 1; i < Object.keys(participants[j]).length; i++)
        {
            const key = Object.keys(participants[j])[i];
                        
            while (Object.keys(participants[j][key]).length > 0)
            {
                let team1 = Object.keys(participants[j][key])[0];
                delete participants[j][key][team1];
            }
        }
    }
    fs.writeFile("matches.json", JSON.stringify(participants, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            //client.channels.cache.get(channelID).send("```diff\n+ Teams Matched.```");
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
        const channelID = Object.keys(games[i])[jSonChannel];
        if(message.channel.id == config.MAIN_CHANNEL || message.channel.id == games[i][channelID])
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
        if(admin[i].id === "role")
            output += ("\n- < " + prefix + admin[i][id] + " > " + admin[i][des] + config.COACH_ROLE);
        else if(admin[i].id === "default"){
            var channel = client.channels.cache.get(config.MAIN_CHANNEL);
            output += ("\n- < " + prefix + admin[i][id] + " > " + admin[i][des] + channel.name);
        }
        else
            output += ("\n- < " + prefix + admin[i][id] + " > " + admin[i][des]);
    }
    
    output += "\n```";
    message.channel.send(output);
}

//add role for queue access
function addRole(message, role){
    config.COACH_ROLE = role;
    fs.writeFile("config.json", JSON.stringify(config, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ Coach role has been updated.```");
        }
    });
}

//add default channel
function addDefault(message, channelID){
    config.MAIN_CHANNEL = channelID;
    fs.writeFile("config.json", JSON.stringify(config, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ Coach role has been updated.```");
        }
    });
}

//Outputs the matches on selected date
function outputMatches(message, id, date) {
    var log = JSON.parse(fs.readFileSync('/matchLog.json', 'utf-8'));
    var gameLogPos = -1;
    for(var j = 0; j < log.length; j++)
    {
        if(log[j].id == id)
        {
            gameLogPos = j;
        }
    }
    if(gameLogPos == -1 || log[gameLogPos][date] == null){
        message.channel.send("```diff\n- " + id + " did not compete on selected date.```");
        return;
    }
    var output = "```md";
    output += ("\n# Matches for " + date);
    
    for(var i = 0; i < Object.keys(log[gameLogPos][date]).length; i++)
    {
        var teamsKey = Object.keys(log[gameLogPos][date])[i];
        for(var j = 0; j < Object.keys(log[gameLogPos][date][teamsKey]).length; j++)
        {
            var matchKey = Object.keys(log[gameLogPos][date][teamsKey])[j];
            var teams = log[gameLogPos][date][teamsKey][matchKey];
            team1 = teams.substr(0, teams.indexOf(" "));
            team2 = teams.substr(teams.indexOf(" ") + 1);
            output += "\n- <@" + client.users.cache.find(user => user.id === team1) + "> vs <@" + client.users.cache.find(user => user.id === team2) + ">";
        }
    }
    output += "\n```";
    message.channel.send(output);
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
        if(games[i][idKey] == id)
        {
            message.channel.send("```diff\n- Error: Game already exists.```");
            return;
        }
    }

    //if game doesn't exist create a file in games.json
    games.push(JSON.parse("{\"" + "id" + "\":\"" + id 
                            +"\", \n\"name\": \"" + name 
                            + "\", \n\"channel\": \"" + "none"
                            + "\", \n\"des\": \"" + "add description"
                            + "\", \n\"max teams\": \"" + parseInt("10")
                            + "\", \n\"weekday\": \"" + "none"
                            + "\", \n\"date\": \"" + "none" 
                            + "\", \n\"queue time\": \"" + "none"
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
            //create section in matches.json for new game
            matches.push(JSON.parse("{\"" + "id" + "\":\"" + id + "\"}"));
            fs.writeFile('matches.json', JSON.stringify(matches, null, 4), (err) =>
            {
                if (err)
                {
                    message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                    console.log(err);
                }
                else {
                    console.log("game added to matches");
                }
            });
            matchLog.push(JSON.parse("{\"" + "id" + "\":\"" + id + "\"}"));
            fs.writeFile('matchLog.json', JSON.stringify(matchLog, null, 4), (err) =>
            {
                if (err)
                {
                    message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                    console.log(err);
                }
                else {
                    console.log("game added to log");
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
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }
    if(des.length == 0){
        message.channel.send("```diff\n- Error: Enter a description. ```");
        return;
    }
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

//Add a channel for listed game
function addChannel(message, id, channelid) {
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }
    let channel = message.guild.channels.cache.get(channelid)
    if(channel == null){
        message.channel.send("```diff\n- Error: Enter a valid channel number. ```");
        return;
    }
    games[index]["channel"] = channelid;
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " channel has been added/updated.```");
        }
    });
}

//Add a weekday (i.e. Sunday = 1, Monday = 2, etc.) for the queue to be available, none can be entered
function addWeekday(message, id, dayOfWeek) {
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }
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
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }
    if(date.length < 8 || date.length > 8 || isNaN(parseInt(date.substr(0,2))) || isNaN(parseInt(date.substr(2,2))) 
        || isNaN(parseInt(date.substr(4,4))) || parseInt(date.substr(0,2)) < 1 || parseInt(date.substr(0,2)) > 12 
        || parseInt(date.substr(2,2)) < 1 || parseInt(date.substr(2,2)) > 31 || parseInt(date.substr(4,4)) < 2020 
        || parseInt(date.substr(4,4)) > 9999) {
        message.channel.send("```diff\n- Error: Inputted date is not valid, please use a valid date in the format MMDDYYYY or none for no date, example: Jan 15, 2021 -> 01152021.```");
        return;
    }
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

function addQueueTime(message, id, queueTime) {
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }

    const queueHr = parseInt(queueTime.substr(0,2));
    const queueMin = parseInt(queueTime.substr(2,2));
    const startTimeKey = Object.keys(games[index])[jSonStart];
    const startTime = games[index][startTimeKey];
    if(queueTime.length < 4 || queueTime.length > 4 || queueHr < 0 || queueHr > 23 
        || queueMin < 0 || queueMin > 59 || isNaN(queueHr) || isNaN(queueMin)) {
        message.channel.send("```diff\n- Error: Inputted time is not valid, please use a valid time in the format HHMM or none for no time, example: 8:45 = 0845.```");
        return;
    }
    else if(parseInt(queueTime) > parseInt(startTime)) {
        message.channel.send("```diff\n- Error: Queue time cannot come after start time, please use a valid time in the format HHMM, example: 8:45 = 0845.```");
        return;
    }
    games[index]["queue time"] = queueTime;
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " competition queue time has been added/updated.```");
        }
    });
}

//Add start and end times for queue to be available, none can be entered for start, end or both for no restrictions
function addTime(message, id, start, end) {
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }
    const startHr = parseInt(start.substr(0,2));
    const startMin = parseInt(start.substr(2,2));
    const endHr = parseInt(end.substr(0,2));
    const endMin = parseInt(end.substr(2,2));
    const queueTimeKey = Object.keys(games[index])[jSonQueue];
    const queueTime = games[index][queueTimeKey];
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
    else if(parseInt(queueTime) > parseInt(start)) {
        message.channel.send("```diff\n- Error: Start time cannot come before queue time, please use a valid time in the format HHMM, example: 8:45 = 0845.```");
        return;
    }
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
            scheduleStartTime();
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
        else if(key === "queue time") {
            var queueTime = games[index]["queue time"];
            output += (queueTime != "none") ? ("\n- < " + key + " > " + queueTime.substr(0,2) + ":" + queueTime.substr(2,2))
                                        : ("\n- < " + key + " > " + queueTime);
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
        else if(key === "max teams") {
            var maxTeams = games[index]["max teams"];
            output += (maxTeams != "none") ? ("\n- < " + key + " > " + games[index][key]) 
                                        : ("\n- < " + key + " > " + games[index][key]);
        }
        else
            output += ("\n- < " + key + " > " + games[index][key]);
    }
    
    output += "\n```";
    message.channel.send(output);
}

function setMaxTeams(message, id, numTeams){
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }
    if(isNaN(parseInt(numTeams))){
        message.channel.send("```diff\n- Error: Inputted number is not valid, please use a valid number for the amount of teams you are entering.```");
        return;
    }
    games[index]["max teams"] = numTeams;
    fs.writeFile("games.json", JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " max competition entries has been added/updated.```");
        }
    });
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
        return true;
    } 
    return false;
}

//add team to queue if the time/date/max teams conditions are met
function addToQueue(message, id, game, numTeams) {
    //Get game info
    var gameList = JSON.parse(fs.readFileSync('/games.json', 'utf-8'));
    const gameName = gameList[game]["name"];
    const channelKey = Object.keys(gameList[game])[jSonChannel];
    const dayKey = Object.keys(gameList[game])[jSonWeek];
    const nameKey = Object.keys(gameList[game])[jSonName];
    const dateKey = Object.keys(gameList[game])[jSonDate];
    const startTimeKey = Object.keys(gameList[game])[jSonStart];
    const endTimeKey = Object.keys(gameList[game])[jSonEnd];
    const maxTeamsKey = Object.keys(gameList[game])[jSonMaxTeams];
    const queueKey = Object.keys(gameList[game])[jSonQueue];
    
    var currentTime = (currentMinutes < 10) ? (parseInt(currentHour.toString() + "0" + currentMinutes.toString()))
                                                : (parseInt(currentHour.toString() + currentMinutes.toString()));
    
    var weekday = (gameList[game][dayKey] != "none") ? (parseInt(gameList[game][dayKey])) : (gameList[game][dayKey]);
    var date = (gameList[game][dateKey] != "none") ? (parseInt(gameList[game][dateKey])) : (gameList[game][dateKey]);

    var dateMonth;
    var dateDay;
    var dateYear;
    var queueTime = (gameList[game][queueKey] != "none") ? (parseInt(gameList[game][queueKey])) : (gameList[game][queueKey]);
    var startTime = (gameList[game][startTimeKey] != "none") ? (parseInt(gameList[game][startTimeKey])) : (gameList[game][startTimeKey]);
    var endTime = (gameList[game][endTimeKey] != "none") ? (parseInt(gameList[game][endTimeKey])) : (gameList[game][endTimeKey]);

    var maxNumTeams = parseInt(gameList[game][maxTeamsKey]);

    if(date != "none") {
        dateMonth = parseInt(gameList[game][dateKey].substr(0,2));
        dateDay = parseInt(gameList[game][dateKey].substr(2,2));
        dateYear = parseInt(gameList[game][dateKey].substr(4,4));
    }

    //Checks that number of teams is indeed a number
    if(isNaN(parseInt(numTeams))) {
        message.channel.send("```diff\n- Error: Inputted number is not valid, please use a valid number for the amount of teams you are entering.```");
        return;
    }
    //Checks that number of teams entered doesn't exceed max allowed
    else if(numTeams > maxNumTeams){
        var messageTxt = "```diff\n- The max number of teams that can be entered is " + maxNumTeams + "```";
        message.channel.send(messageTxt);
        return;
    }

    if(message.channel.id != config.MAIN_CHANNEL && message.channel.id != gameList[game][channelKey])
    {
        message.channel.send("```diff\n- Must be in the " + gameName + " channel to join queue```");
        return;
    }
    //Checks if weekday or date has been set, then checks time to make sure currentTime is valid to join queue
    if((weekday === "none" && date === "none") 
        || weekday == day.getDay()
        || (currentMonth + 1 == dateMonth && currentDay == dateDay && currentYear == dateYear)) {
        if((currentTime >= queueTime && currentTime <= endTime) 
            || (queueTime === "none" && currentTime <= endTime) 
            || (currentTime >= queueTime && endTime === "none")
            || (queueTime === "none" && endTime === "none")) {
                gameQ(message, gameList[game][id], gameList[game][nameKey], numTeams);
        }
        else {
            var messageTxt = (queueTime != "none" && endTime != "none") ? 
                ("```diff\n- Queue time for " + gameName + " starts at " + queueTime + " and ends at " + endTime + " current time is " + currentTime + "```") :
                (queueTime != "none") ? ("```diff\n- Queue time for " + gameName + " starts at " + queueTime + "```") :
                ("```diff\n- Queue time for " + gameName + " ended at " + endTime + "```");
            message.channel.send(messageTxt);
            return;
        }
    }
    //One or more of the conditions have not been met, output queue window to clarify availability to user
    else
    {
        var messageTxt = (weekday === "none" && queueTime != "none" && endTime != "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " from " + queueTime + " to " + endTime + "```") :

                    (weekday === "none" && queueTime === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + "```") :
                    
                    (weekday === "none" && queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " until " + endTime + "```") :

                    (weekday === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " starting at " + queueTime + "```") :

                    (endTime === "none" && queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s```"):

                    (queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s until " + endTime + "```") :

                    (endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s starting at " + queueTime + "```"):


                    ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s from " + queueTime + " to " + endTime + "```");

        message.channel.send(messageTxt);
        return;
    }
}

//connection ready
client.on('ready', (evt) => {
    console.log("Connected");
    numGames = games.length;
    let scheduledMessage = new cron.schedule('00 00 05 * * *', () => {
    // This runs every day at 05:00:00 to set tournament start schedule
        clearQueues();
        //send out match notifications at 3pm
        scheduleStartTime();
    });
    scheduledMessage.start()
});

function scheduleStartTime() {
    //scroll through game json and find all games with current day of the week or current date

    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const dayKey = Object.keys(games[i])[jSonWeek];
        const dateKey = Object.keys(games[i])[jSonDate];
        const startTimeKey = Object.keys(games[i])[jSonStart];
        var startHr="";
        var startMin="";
        var weekday = (games[i][dayKey] != "none") ? (parseInt(games[i][dayKey])) : (games[i][dayKey]);
        var date = (games[i][dateKey] != "none") ? (parseInt(games[i][dateKey])) : (games[i][dateKey]);
        var dateMonth="";
        var dateDay="";
        var dateYear="";
        if(games[i][startTimeKey] != "none") {
            startHr = parseInt(games[i][startTimeKey].substr(0,2));
            startMin = parseInt(games[i][startTimeKey].substr(2,2));
        }
        if(date != "none") {
            dateMonth = parseInt(games[i][dateKey].substr(0,2));
            dateDay = parseInt(games[i][dateKey].substr(2,2));
            dateYear = parseInt(games[i][dateKey].substr(4,4));
        }

        //add cron job to release matches at game's specified start time
        if((weekday === currentWeekDay || 
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)) 
            && games[i][startTimeKey] != "none")
        {
            var time = '00 ' + startMin + ' ' + startHr + ' * * *';
            cronJobs.push(
                cron.schedule(
                    time,
                    () => {
                        getCurrentMatches();
                    }
                )
            );
            //console.log("Schedule set for " + games[i][id]);
        }
        //if start time hasn't been set the matches are released at noon
        else if((weekday === currentWeekDay ||
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear))
             && games[i][startTimeKey] === "none")
        {
            cronJobs.push(
                cron.schedule(
                    '00 00 12 * * *',
                    () => {
                        getCurrentMatches();
                    }
                )
            );
        }
        //if no date or day of week has been set then adds cron job as specified game start time
        else if(weekday === "none" && date === "none" && games[i][startTimeKey] != "none") {
            var time = '00 ' + startMin + ' ' + startHr + ' * * *';
            cronJobs.push(
                cron.schedule(
                    time,
                    () => {
                        getCurrentMatches();
                    }
                )
            );
        }
        else if(weekday === "none" && date === "none" && games[i][startTimeKey] === "none") {
            cronJobs.push(
                cron.schedule(
                    '00 00 12 * * *',
                    () => {
                        getCurrentMatches();
                    }
                )
            );
        }
    }

    //add each game's start time to the cron job as long as the start time isn't "none"
    
}

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
    day = new Date();
    currentWeekDay = (day.getUTCHours() < 5) ? day.getUTCDay() - 1: day.getUTCDay();
    currentMonth = (day.getUTCHours() < 5) ? day.getUTCMonth() : day.getUTCMonth() + 1;
    currentDay =  (day.getUTCHours() < 5) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = (day.getUTCHours() < 5) ? day.getUTCFullYear() - 1: day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 4) ? day.getUTCHours() - 5 + 12 : day.getUTCHours() - 5;

    //console.log("weekday: " + currentWeekDay + "\nmonth: " + currentMonth + "\nday: " + currentDay
    //                + "\nyear: " + currentYear + "\nhour: "+ currentHour + "\nminutes: " + currentMinutes);
    //set default channel from this message if it doesn't already exist
    if(config.MAIN_CHANNEL === "none") {
        config.MAIN_CHANNEL = message.channel.id;
        fs.writeFile("config.json", JSON.stringify(config, null, 4), (err) =>
        {
            if (err)
            {
                message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                console.log(err);
            }
        });
    }

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

    if(call === "help") {   //calls to help menu display
        helpCommand(message);
    }
    else if (call == "admin") { //checks if user has admin privileges, if does calls to admin menu display
        if (!hasPermission(message, "admin"))
        {
            message.channel.send("```diff\n- You must be an admin to use admin commands.```");
            return;
        }
        adminMenu(message);
    }
    else if(adminFound) { //checks if user has admin privileges, if does processes command
        if (!hasPermission(message, "admin"))
        {
            message.channel.send("```diff\n- You must be an admin to use admin commands.```");
            return;
        }
        switch (call) {
            case "role":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                addRole(message, args.join(" "));
                break;
            case "default":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                addDefault(message, args.join(" "));
                break;
            case "output":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                outputMatches(message, args.shift().toLowerCase(), args.join(" "));
                break;
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
            case "channel":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addChannel(message, args.shift().toLowerCase(), args.join(" "));
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
            case "max":
                if(args.length < 2) {
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                setMaxTeams(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "queue":
                if(args.length < 2) {
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addQueueTime(message, args.shift().toLowerCase(), args.join(" "));
                break;
        }
    }
    else if(found) { //checks if user has School Coach privileges, if does processes queue commands
        if (!hasPermission(message, config.COACH_ROLE))
        {
            message.channel.send("```diff\n- You must be a School Coach to join a queue.```");
            return;
        }
        else if(args.length < 1){
            message.channel.send("```diff\n- Invalid number of arguments. If you are only adding one team please enter 1 after the game name.```");
            return; 
        }
        addToQueue(message, id, game, args.shift().toLowerCase());
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
