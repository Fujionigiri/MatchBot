//discord module require
const Discord = require('discord.js');

//discord client
const client = new Discord.Client();

process.env.TZ = "UTC";

//other requireds
const config = require("./data/config.json");
const cron = require('node-cron');
var cronJobs = [];
var fs = require("fs");
var path = require("path");
const gameJson = require("./data/games.json");
const admin = require("./admin.json");
const menu = require("./menu.json")
const matches = require("./data/matches.json");
const teams = require("./data/teams.json");
const matchLog = require("./data/matchLog.json");
const prefix = "!";
var numGames = 0;
var participants;
var games;
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
const jSonQueueEnd = 8;
const jSonStart = 9;
const jSonEnd = 10;

//Adds team to requested game queue (example: !overwatch 3 -> adds coaches discord id to matches.json overwatch queue under 3 teams) 
//if date and time are valid and game exists.
function gameQ(message, call, name, numTeams)
{
    //console.log("directory: " + __dirname);
    var gamePos = 0;
    var teamNumbers = numTeams + " team(s)";
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
                    //console.log("key: " + key + "  teams[key]: " + teams[key]);
                    if(key == message.member.user.id)
                    {
                        message.channel.send("```diff\n- Your team is already queued.```");
                        return;
                    }
                }
            }
        }
    }
    //Check if team has competed before if not add to teams json
    var server = client.guilds.cache.get(message.guild.id);

    var value = message.member.user.id;
    if(participants[gamePos][teamNumbers] == null) {
        participants[gamePos][teamNumbers] = JSON.parse("{}");
    }
    
    participants[gamePos][teamNumbers][value] = server.members.cache.get(value).displayName;
    fs.writeFile(path.join(__dirname + '/data/matches.json'), JSON.stringify(participants, null, 4), (err) =>
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
    participants = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matches.json'), 'utf-8'));

    var log = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matchLog.json'), 'utf-8'));
    var completeDate = (currentMonth < 10) ? (currentDay < 10 ? "0" + currentMonth.toString() + "0" + currentDay.toString() + currentYear.toString()
                                                                : "0" + currentMonth.toString() + currentDay.toString() + currentYear.toString())
                                                                : currentMonth.toString() + currentDay.toLowerCase() + currentYear.toString();
    var channelID = config.MAIN_CHANNEL;
    //scroll through game json and find all games with current day of the week or current date
    day = new Date();
    currentWeekDay = (day.getUTCHours() < 5) ? day.getUTCDay()-1: day.getUTCDay();
    currentMonth = day.getUTCMonth() + 1;
    currentDay =  (day.getUTCHours() < 5) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 4) ? day.getUTCHours() - 5 + 24 : day.getUTCHours() - 5;
    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const dayKey = Object.keys(games[i])[jSonWeek];
        const dateKey = Object.keys(games[i])[jSonDate];
        const queueEndTimeKey = Object.keys(games[i])[jSonQueueEnd];    
        const startTimeKey = Object.keys(games[i])[jSonStart];
        const endTimeKey = Object.keys(games[i])[jSonEnd];
        var startHr="";
        var startMin="";
        var queueEndHr = "";
        var queueEndMin = "";
        var queueEndTime = 0;
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
        if(games[i][queueEndTimeKey] != "none") {
            queueEndHr = games[i][queueEndTimeKey].substr(0,2);
            queueEndMin = games[i][queueEndTimeKey].substr(2,2);
            queueEndTime = parseInt(queueEndHr + queueEndMin);
        }
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
        //client.channels.cache.get(channelID).send("```Finding matches : " + currentTime + " " + currentWeekDay + ".```");
        //add cron job to release matches at game's specified start time
        if((weekday === currentWeekDay || 
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)))
        {
            if(games[i][queueEndTimeKey] != "none" && (currentTime >= queueEndTime && currentTime < startTime)) {
                setMatches(games[i][id], participants, completeDate, games, log);
            }
            else if (games[i][startTimeKey] != "none" && (currentTime >= startTime && currentTime <= endTime)) {
                setMatches(games[i][id], participants, completeDate, games, log);
            }
        }
        //if start time hasn't been set the matches are released at noon
        else if((weekday === currentWeekDay ||
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear))
             && games[i][startTimeKey] === "none" && games[i][queueEndTimeKey] === "none")
        {
            setMatches(games[i][id], participants, completeDate, games, log);
        }
        //if no date or day of week has been set then adds cron job as specified game start time
        else if(weekday === "none" && date === "none" && games[i][queueEndTime] != "none") {
            setMatches(games[i][id], participants, completeDate, games, log);
        }
        else if(weekday === "none" && date === "none" && games[i][queueEndTime] === "none") {
            setMatches(games[i][id], participants, completeDate, games, log);
        }
    }
    fs.writeFile(path.join(__dirname + '/data/matches.json'), JSON.stringify(participants, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
    });
    
    fs.writeFile(path.join(__dirname + '/data/matchLog.json'), JSON.stringify(log, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
    });
}

//Send out match notifications
function setMatches(gameId, participants, completeDate, games, log) {
    var gamePos = 0;
    var channel = "";
    var gameName = "";
    for(var j = 0; j < participants.length; j++)
    {
        if(participants[j].id == gameId)
        {
            for(var k = 0; k < games.length; k++)
            {
                if(games[k].id == gameId){
                    var channelKey = Object.keys(games[gamePos])[jSonChannel];
                    channel = (games[k][channelKey] != "none") ? (games[k][channelKey]) : config.MAIN_CHANNEL;
                    var nameKey = Object.keys(games[k])[jSonName];
                    gameName = games[k][nameKey];
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
            //console.log("matching teams " + key);
            var team1Pos = Math.floor(Math.random() * Object.keys(participants[gamePos][key]).length);
            let team1 = Object.keys(participants[gamePos][key])[team1Pos];
            let team1Name = participants[gamePos][key][team1];
            delete participants[gamePos][key][team1];
            var team2Pos = Math.floor(Math.random() * Object.keys(teams).length)
            let team2 = Object.keys(participants[gamePos][key])[team2Pos];
            let team2Name = participants[gamePos][key][team2]
            delete participants[gamePos][key][team2];
            client.channels.cache.get(channel).send("<@" + team1 + ">" + " " +  "<@" + team2 + "> set up " + key + " for " + gameName + ".");
            if(log[gamePos][completeDate] == null) {
                log[gamePos][completeDate] = JSON.parse("{}");
            }
            if(log[gamePos][completeDate][key] == null) {
                log[gamePos][completeDate][key] = JSON.parse("{}");
            }
            var matchSets = log[gameLogPos][completeDate][key];

            log[gameLogPos][completeDate][key]["match" + Object.keys(matchSets).length] = team1Name + ", " + team2Name;
        }
    }
}

//Clears all queues when called to
function clearQueues() {
    console.log("Clearing queues");
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
    var channelID = config.MAIN_CHANNEL;
    fs.writeFile(path.join(__dirname + '/data/matches.json'), JSON.stringify(matches, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else {
            client.channels.cache.get(channelID).send("```diff\n- Queues cleared.```");
        }
    });
}

//Displays queue menu in discord channel where called
function helpCommand(message)
{
    var output = "```md";
    
    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const nameKey = Object.keys(games[i])[jSonName];
        const des = Object.keys(games[i])[jSonDes];
        const channelID = Object.keys(games[i])[jSonChannel];
        if(message.channel.id == config.MAIN_CHANNEL || message.channel.id == games[i][channelID])
            output += ("\n**" + games[i][nameKey] + " Queue**\n" + games[i][des]);
    }
    
    output += ("\n\n# Menu commands");
    
    if(games.length == 0) {
        output += "\nNo games have been added yet";
    }
    for(var i = 0; i < menu.length; i++)
    {
        const id = Object.keys(menu[i])[1];
        const des = Object.keys(menu[i])[2];
        output += ("\n- < " + prefix + menu[i][id] + " > " + menu[i][des]);
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
    updateJson(message, "config", config, "```diff\n+ Coach role has been updated.```");
}

//add default channel
function addDefault(message, channelID){
    config.MAIN_CHANNEL = channelID;
    updateJson(message, "config", config, "```diff\n+ Default channel has been updated.```");
}

//Outputs the matches on selected date from the matchLog
function outputMatches(message, id, date) {
    var log = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matchLog.json'), 'utf-8'));
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
    output += ("\n# Matches for " + id + " on " + date);
    
    for(var i = 0; i < Object.keys(log[gameLogPos][date]).length; i++)
    {
        var teamsKey = Object.keys(log[gameLogPos][date])[i];
        output += "\n# " + teamsKey;
        for(var j = 0; j < Object.keys(log[gameLogPos][date][teamsKey]).length; j++)
        {
            var matchKey = Object.keys(log[gameLogPos][date][teamsKey])[j];
            var teams = log[gameLogPos][date][teamsKey][matchKey];
            team1 = teams.substr(0, teams.indexOf(","));
            team2 = teams.substr(teams.indexOf(",") + 1);
            team1 = (client.users.cache.get(team1) == null) ? team1 : (client.users.cache.get(team1).username);
            team2 = (client.users.cache.get(team2) == null) ? team2 : (client.users.cache.get(team2).username);
            output += "\n- < " + team1 + " > vs < " + team2 + " >";
        }
    }
    output += "\n```";
    message.channel.send(output);
}

function listTeams(message, id) {
    var gamePos = -1;
    for(var j = 0; j < participants.length; j++)
    {
        if(participants[j].id == id)
        {
            gamePos = j;
        }
    }
    if(gamePos == -1){
        message.channel.send("```diff\n- " + id + " is not an available game.```");
        return;
    }
    var output = "```md";
    output += ("\n# Matches for " + id);
    var server = client.guilds.cache.get(message.guild.id);
    //console.log(server.members.cache.get("643565925185880074").displayName); 
    //console.log(client.users.cache.get("793925291931861003").username);
    for(var i = 0; i < Object.keys(participants[gamePos]).length; i++)
    {
        var teamsKey = Object.keys(participants[gamePos])[i];
        if(teamsKey != "id") {
            output += "\n# " + teamsKey;
            for(var j = 0; j < Object.keys(participants[gamePos][teamsKey]).length; j++)
            {
                var matchKey = Object.keys(participants[gamePos][teamsKey])[j];
                var team = participants[gamePos][teamsKey][matchKey];
                
                //team = (client.users.cache.get(team) == null) ? team : (client.users.cache.get(team).username);
                output += "\n- < " + team + " >";
            }
        }
    }
    output += "\n```";
    message.channel.send(output);
}

function removeTeam(message, id, coachId){
    var gamePos = -1;
    for(var j = 0; j < participants.length; j++)
    {
        if(participants[j].id == id)
        {
            gamePos = j;
        }
    }
    if(gamePos == -1){
        message.channel.send("```diff\n- " + id + " is not an available game.```");
        return;
    }
    
    for(var i = 0; i < Object.keys(participants[gamePos]).length; i++)
    {
        var teamsKey = Object.keys(participants[gamePos])[i];
        if(teamsKey != "id") {
            for(var j = 0; j < Object.keys(participants[gamePos][teamsKey]).length; j++)
            {
                var matchKey = Object.keys(participants[gamePos][teamsKey])[j];
                if(matchKey === coachId) {
                    delete participants[gamePos][teamsKey][matchKey];
                    message.channel.send("```diff\n- Team has been removed.```");
                    updateJson(message, "matches", participants, "none");
                    return;
                }
            }
        }
    }
    message.channel.send("```diff\n- There is no team in the selected queue with that id.```");
}

//Adds new game to list if it doesn't already exist by id, adds info to games.json and creates a matching json to store queued teams
function addGame(message, id, name) {
    if(name.length == 0) {
        message.channel.send("```diff\n- Error: Enter an id and game name. The id should have no spaces, the game name can have spaces.```");
        return;
    }

    var log = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matchLog.json'), 'utf-8'));

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
                            + "\", \n\"queue start\": \"" + "none"
                            + "\", \n\"queue end\": \"" + "none"
                            + "\", \n\"start time\": \"" + "none" 
                            + "\", \n\"end time\": \"" + "none" + "\"}"));

    //update games.json with new games array file
    fs.writeFile(path.join(__dirname + '/data/games.json'), JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            //create section in matches.json for new game
            matches.push(JSON.parse("{\"" + "id" + "\":\"" + id + "\",\n\"1 team(s)\" : {}\n}"));
            updateJson(message, "matches", matches, "none");
            var gamePos = -1;
            for(var j = 0; j < log.length; j++)
            {
                if(log[j].id == id)
                {
                    gamePos = j;
                }
            }
            //if game doesn't currently have a log add to json
            if(gamePos == -1){
                matchLog.push(JSON.parse("{\"" + "id" + "\":\"" + id + "\"}"));
                updateJson(message, "matchLog", matchLog, "none");
                return;
            }
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
        updateJson(message, "games", games, "```diff\n+ " + id + " has been removed.```");
        index = matches.findIndex(a=> a.id === id);
        if(index > -1) {
            matches.splice(index, 1);
            updateJson(message, "matches", matches, "none");
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
    updateJson(message, "games", games, "```diff\n+ " + id + " description has been added/updated.```");
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
    updateJson(message, "games", games, "```diff\n+ " + id + " channel has been added/updated.```");
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
    updateJson(message, "games", games, "```diff\n+ " + id + " weekly competition day has been added/updated.```");
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
    updateJson(message, "games", games, "```diff\n+ " + id + " competition date has been added/updated.```")
}

function addQueueTime(message, id, queueTime, queueEnd) {
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !help for the list of games.```");
        return;
    }

    const queueHr = parseInt(queueTime.substr(0,2));
    const queueMin = parseInt(queueTime.substr(2,2));
    const queueEndHr = parseInt(queueEnd.substr(0,2));
    const queueEndMin = parseInt(queueEnd.substr(2,2));
    const startTimeKey = Object.keys(games[index])[jSonStart];
    const startTime = games[index][startTimeKey];
    if(queueTime.length < 4 || queueTime.length > 4 || queueHr < 0 || queueHr > 23 
        || queueMin < 0 || queueMin > 59 || isNaN(queueHr) || isNaN(queueMin)) {
        message.channel.send("```diff\n- Error: Inputted time is not valid, please use a valid time in the format HHMM or none for no time, example: 8:45 = 0845.```");
        return;
    }
    else if(queueEnd.length < 4 || queueEnd.length > 4 || queueEndHr < 0 || queueEndHr > 23 
        || queueEndMin < 0 || queueEndMin > 59 || isNaN(queueEndHr) || isNaN(queueEndMin)) {
        message.channel.send("```diff\n- Error: Inputted time is not valid, please use a valid time in the format HHMM or none for no time, example: 8:45 = 0845.```");
        return;
    }
    else if(parseInt(queueTime) > parseInt(startTime) || parseInt(queueEnd) > parseInt(startTime)) {
        message.channel.send("```diff\n- Error: Queue time cannot come after start time, please use a valid time in the format HHMM, example: 8:45 = 0845.```");
        return;
    }
    else if(parseInt(queueTime) > parseInt(queueEnd)) {
        message.channel.send("```diff\n- Error: Start time cannot come after end time, please use a valid time in the format HHMM, example: 8:45 = 0845.```");
        return;
    }
    games[index]["queue start"] = queueTime;
    games[index]["queue end"] = queueEnd;
    fs.writeFile(path.join(__dirname + '/data/games.json'), JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            message.channel.send("```diff\n+ " + id + " queue time has been added/updated.```");
            scheduleStartTime();
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
    const queueEndTimeKey = Object.keys(games[index])[jSonQueueEnd];
    const queueEndTime = games[index][queueEndTimeKey];
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
    else if(parseInt(queueTime) > parseInt(start) || parseInt(queueEndTime) > parseInt(start)) {
        message.channel.send("```diff\n- Error: Start time cannot come before queue time, please use a valid time in the format HHMM, example: 8:45 = 0845.```");
        return;
    }
    games[index]["start time"] = start;
    games[index]["end time"] = end;
    fs.writeFile(path.join(__dirname + '/data/games.json'), JSON.stringify(games, null, 4), (err) =>
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
        else if(key === "queue start") {
            var queueTime = games[index]["queue start"];
            output += (queueTime != "none") ? ("\n- < " + key + " > " + queueTime.substr(0,2) + ":" + queueTime.substr(2,2))
                                        : ("\n- < " + key + " > " + queueTime);
        }
        else if(key === "queue end") {
            var queueTime = games[index]["queue end"];
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
    updateJson(message, "games", games, "```diff\n+ " + id + " max competition entries has been added/updated.```")
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
    var gameList = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/games.json'), 'utf-8'));
    const gameName = gameList[game]["name"];
    const channelKey = Object.keys(gameList[game])[jSonChannel];
    const dayKey = Object.keys(gameList[game])[jSonWeek];
    const nameKey = Object.keys(gameList[game])[jSonName];
    const dateKey = Object.keys(gameList[game])[jSonDate];
    const startTimeKey = Object.keys(gameList[game])[jSonStart];
    const endTimeKey = Object.keys(gameList[game])[jSonEnd];
    const maxTeamsKey = Object.keys(gameList[game])[jSonMaxTeams];
    const queueKey = Object.keys(gameList[game])[jSonQueue];
    const queueEndKey = Object.keys(gameList[game])[jSonQueueEnd];
    
    var currentTime = (currentMinutes < 10) ? (parseInt(currentHour.toString() + "0" + currentMinutes.toString()))
                                                : (parseInt(currentHour.toString() + currentMinutes.toString()));
    
    var weekday = (gameList[game][dayKey] != "none") ? (parseInt(gameList[game][dayKey])) : (gameList[game][dayKey]);
    var date = (gameList[game][dateKey] != "none") ? (parseInt(gameList[game][dateKey])) : (gameList[game][dateKey]);

    var dateMonth;
    var dateDay;
    var dateYear;
    var queueTime = (gameList[game][queueKey] != "none") ? (parseInt(gameList[game][queueKey])) : (gameList[game][queueKey]);
    var queueEndTime = (gameList[game][queueEndKey] != "none") ? (parseInt(gameList[game][queueEndKey])) : (gameList[game][queueEndKey]);
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
        || weekday == currentWeekDay
        || (currentMonth + 1 == dateMonth && currentDay == dateDay && currentYear == dateYear)) {
        if((currentTime >= queueTime && currentTime <= queueEndTime) 
            || (currentTime >= startTime && currentTime <= endTime)
            || (currentTime >= queueTime && queueEndTime === "none")
            || (queueTime === "none" && endTime === "none")) {
                gameQ(message, id, gameList[game][nameKey], numTeams);
        }
        else {
            var messageTxt = (queueTime != "none" && endTime != "none") ? 
                ("```diff\n- Queue time for " + gameName + " starts at " + queueTime + " and ends at " + queueEndTime + " current time is " + currentTime + "```") :
                (queueTime != "none") ? ("```diff\n- Queue time for " + gameName + " starts at " + queueTime + "```") :
                ("```diff\n- Queue time for " + gameName + " ended at " + queueEndTime + "```");
            message.channel.send(messageTxt);
            return;
        }
    }
    //One or more of the conditions have not been met, output queue window to clarify availability to user
    else
    {
        var messageTxt = (weekday === "none" && queueTime != "none" && endTime != "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " from " + queueTime + " to " + queueEndTime + "```") :

                    (weekday === "none" && queueTime === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + "```") :
                    
                    (weekday === "none" && queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " until " + queueEndTime + "```") :

                    (weekday === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " starting at " + queueTime + "```") :

                    (endTime === "none" && queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s```"):

                    (queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s until " + queueEndTime + "```") :

                    (endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s starting at " + queueTime + "```"):

                    ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(weekday.toString()) + "s from " + queueTime + " to " + queueEndTime +  "```");

        message.channel.send(messageTxt);
        return;
    }
}

function updateJson(message, filename, file, output) {
    fs.writeFile(path.join(__dirname + '/data/' + filename + '.json'), JSON.stringify(file, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            if(output != "none")
                message.channel.send(output);
        }
    });
}

//connection ready
client.on('ready', (evt) => {
    console.log("Connected");
    games = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/games.json'), 'utf-8'));
    numGames = games.length;
    let scheduledMessage = new cron.schedule('00 00 09 * * *', () => {
    // This runs every day at 04:00:00 to set tournament start schedule
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
        const matchTimeKey = Object.keys(games[i])[jSonQueueEnd];
        var startHr="";
        var startMin="";
        var weekday = (games[i][dayKey] != "none") ? (parseInt(games[i][dayKey])) : (games[i][dayKey]);
        var date = (games[i][dateKey] != "none") ? (parseInt(games[i][dateKey])) : (games[i][dateKey]);
        var dateMonth="";
        var dateDay="";
        var dateYear="";
        if(games[i][matchTimeKey] != "none") {
            var sTime = 0;
            if(parseInt(games[i][matchTimeKey].substr(0,2)) > 19) {
                sTime = (parseInt(games[i][matchTimeKey].substr(0,2)) - 19)
                startHr = "0" + sTime.toString();
            }
            else{
                sTime = (parseInt(games[i][matchTimeKey].substr(0,2)) + 5)
                if(sTime < 10){
                    startHr = "0" + sTime.toString();
                }
                else {
                    startHr = sTime.toString();
                }
            }
            startMin = games[i][matchTimeKey].substr(2,2);
        }
        if(date != "none") {
            dateMonth = parseInt(games[i][dateKey].substr(0,2));
            dateDay = parseInt(games[i][dateKey].substr(2,2));
            dateYear = parseInt(games[i][dateKey].substr(4,4));
        }

        //add cron job to release matches at game's specified start time
        if((weekday === currentWeekDay || 
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)) 
            && games[i][matchTimeKey] != "none")
        {
            //console.log("Setting cron");
            var time = '00 ' + startMin + ' ' + startHr + ' * * *';
            cronJobs.push(
                cron.schedule(
                    time,
                    () => {
                        getCurrentMatches();
                    }
                ), undefined, true, "UTC"
            );
            //console.log("Schedule set for " + games[i][id]);
        }
        //if start time hasn't been set the matches are released at noon
        else if((weekday === currentWeekDay ||
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear))
             && games[i][matchTimeKey] === "none")
        {
            cronJobs.push(
                cron.schedule(
                    '00 00 12 * * *',
                    () => {
                        getCurrentMatches();
                    }
                ), undefined, true, "UTC"
            );
        }
        //if no date or day of week has been set then adds cron job as specified game start time
        else if(weekday === "none" && date === "none" && games[i][matchTimeKey] != "none") {
            var time = '00 ' + startMin + ' ' + startHr + ' * * *';
            cronJobs.push(
                cron.schedule(
                    time,
                    () => {
                        getCurrentMatches();
                    }
                ), undefined, true, "UTC"
            );
        }
        else if(weekday === "none" && date === "none" && games[i][matchTimeKey] === "none") {
            cronJobs.push(
                cron.schedule(
                    '00 00 12 * * *',
                    () => {
                        getCurrentMatches();
                    }
                ), undefined, true, "UTC"
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
    participants = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matches.json'), 'utf-8'));
    games = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/games.json'), 'utf-8'));
    const args = message.content.slice(prefix.length).split(/ +/);
    const call = args.shift().toLowerCase();
    var id;
    var channelID;
    var gameSpot = -1;
    var command;
    let found = false;
    let adminFound = false;
    day = new Date();
    currentWeekDay = (day.getUTCHours() < 5) ? day.getUTCDay() - 1: day.getUTCDay();
    currentMonth = day.getUTCMonth()+1;
    currentDay =  (day.getUTCHours() < 5) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 4) ? day.getUTCHours() - 5 + 24 : day.getUTCHours() - 5;


    var utcTime = "month: " + day.getUTCMonth() + " day: " + day.getUTCDate() + " year: " + day.getUTCFullYear() 
                    + " hour: " + day.getUTCHours() + " mintues: " + day.getUTCMinutes();
    var curTime = "weekday: " + currentWeekDay + "\nmonth: " + currentMonth + "\nday: " + currentDay
                    + "\nyear: " + currentYear + "\nhour: "+ currentHour + "\nminutes: " + currentMinutes;
    //set default channel from this message if it doesn't already exist
    if(config.MAIN_CHANNEL === "none") {
        config.MAIN_CHANNEL = message.channel.id;
        fs.writeFile(path.join(__dirname + '/data/config.json'), JSON.stringify(config, null, 4), (err) =>
        {
            if (err)
            {
                message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
                console.log(err);
            }
        });
    }

    //Gets game id for channel commands
    for(var i = 0; i < games.length; i++)
    {
        channelID = Object.keys(games[i])[jSonChannel];
        if(games[i][channelID] === message.channel.id)
        {
            gameSpot = i;
            found = true;
            break;
        }
    }

    //Checks that game id exits (for admin commands)
    for(var i = 0; i < games.length; i++)
    {
        id = Object.keys(games[i])[jSonId];
        if(games[i][id].toLowerCase() === call.toLowerCase())
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
        if(admin[i][command] === call || call === "clearqueues" || call === "gettime")
        {
            adminCommand = i;
            adminFound = true;
            break;
        }
    }
    
    if(call === "menu") {   //calls to help menu display
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
    else if(adminFound && args.length > 0) { //checks if user has admin privileges, if does processes command
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
            case "log":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                outputMatches(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "list":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                listTeams(message, args.join(" "));
                break;
            case "removeteam":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                removeTeam(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "addgame":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addGame(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "removegame":
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
                if(args.length < 3) {
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return; 
                }
                addQueueTime(message, args.shift().toLowerCase(), args.shift(), args.join(" "));
                break;
            case "clearqueues":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                if(args.join(" ") === "admin")
                    clearQueues();
                else
                    message.channel.send("```diff\n- Invalid password.```");
                break;
            case "gettime":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                if(args.join(" ") === "admin"){
                    message.channel.send("utc: " + day.getHours() + ": " + day.getMinutes() + "\ncurrent: " + curTime);
                }
                else
                    message.channel.send("```diff\n- Invalid password.```");
                break;
        }
    }
    else if(found) { //checks if user has School Coach privileges, if does processes queue commands
        if (!hasPermission(message, config.COACH_ROLE))
        {
            message.channel.send("```diff\n- You must be a School Coach to join a queue.```");
            return;
        }
        else if(call === "join") {
            if(args.length == 1 && gameSpot != -1){
                //console.log(gameSpot);
                addToQueue(message, games[gameSpot][id], gameSpot, args.shift().toLowerCase());
            }
            else{
                message.channel.send("```diff\n- Invalid number of arguments. If you are only adding one team please enter 1 after join, ex: !join 1.```");
                return; 
            }
        }
        else if(call === "list" && args.length < 1) {
            if(args.length < 1 && gameSpot != -1){
                listTeams(message, games[gameSpot][id]);
            }
            else {
                message.channel.send("```diff\n- There is not an available list for this game.```");
            }
        }
        else if(call === "remove" && args.length < 1) {
            if(args.length < 1 && gameSpot != -1){
                removeTeam(message, games[gameSpot][id], message.member.user.id);        
            }
            else {
                message.channel.send("```diff\n- There is not an available queue for this game.```");
            }
        }
        else if(args.length == 1 && config.MAIN_CHANNEL == message.channel.id && hasPermission(message, "admin")){
            addToQueue(message, games[game][id], game, args.shift().toLowerCase());
        }
        else { //Entered command was invalid
            message.channel.send("```diff\n- Invalid Input ```");
            return;
        }
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
