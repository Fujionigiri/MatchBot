//fix problem with the scheduling variable. Currently when teams join after start time, the scheduling variable
//prevents the matches from being released line 447

//discord module require
const Discord = require('discord.js');

//discord client
const client = new Discord.Client();

process.env.TZ = "UTC";

//other requireds
const config = require("./data/config.json");
const cron = require('node-cron');
var cronJobs = [];
var queueList = [];
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
var daylightSavings;
var coachRoleId;
var scheduling = false;
var queueing = false;
var coachList = [];
const jSonId = 0;
const jSonName = 1;
const jSonChannel = 2;
const jSonDes = 3;
const jSonMaxTeams = 4;
const jSonWeek = 5;
const jSonQWeek = 6;
const jSonDate = 7;
const jSonQueue = 8;
const jSonQueueEnd = 9;
const jSonStart = 10;
const jSonEnd = 11;

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

    var server = client.guilds.cache.get(message.guild.id);

    var value = message.member.user.id;
    var numTeams = parseInt(teamNumbers.substr(0,1));
    if(participants[gamePos][teamNumbers] == null) {
        for(var i = 1; i <= numTeams; i++)
        {
            if(participants[gamePos][i.toString() + " team(s)"] == null){
                console.log(i.toString() + " team(s) added");
                participants[gamePos][i.toString() + " team(s)"] = JSON.parse("{}");
            }
        }
    }
    
    participants[gamePos][teamNumbers][value] = server.members.cache.get(value).displayName;
    //Check if team has competed before if not add to teams json
    addTeamInfo(message, message.member.user.id, server.members.cache.get(value).displayName, call)

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
            console.log("Team added to queue " + message.member.user.id);
            getCurrentMatches();
        }
    });
}

function openQueue() {
    //scroll through game json and find all games with current day of the week or current date
    day = new Date();
    currentWeekDay = (day.getUTCHours() < 4) ? day.getUTCDay()-1: day.getUTCDay();
    currentMonth = day.getUTCMonth() + 1;
    currentDay =  (day.getUTCHours() < 4) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 3) ? day.getUTCHours() - 4 + 24 : day.getUTCHours() - 4;

    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const dayKey = Object.keys(games[i])[jSonQWeek];
        const dateKey = Object.keys(games[i])[jSonDate];
        const queueStartTimeKey = Object.keys(games[i])[jSonQueue];    
        const startTimeKey = Object.keys(games[i])[jSonStart];
        const endTimeKey = Object.keys(games[i])[jSonEnd];
        var queueEndHr = "";
        var queueEndMin = "";
        var queueEndTime = 0;
        var queueStartHr = "";
        var queueStartMin = "";
        var queueStartTime = 0;
        var endHr="";
        var endMin="";
        endTime = 0;
        console.log("Current matches for: " + games[i][id]);
        var currentTime = (currentMinutes < 10) ? parseInt(currentHour.toString() + "0" + currentMinutes.toString()):
                                                    parseInt(currentHour.toString() + currentMinutes.toString());
        var weekday = (games[i][dayKey] != "none") ? (parseInt(games[i][dayKey])) : (games[i][dayKey]);
        var date = (games[i][dateKey] != "none") ? (parseInt(games[i][dateKey])) : (games[i][dateKey]);
        var dateMonth="";
        var dateDay="";
        var dateYear="";
        if(games[i][queueStartTimeKey] != "none") {
            queueStartHr = games[i][queueStartTimeKey].substr(0,2);
            queueStartMin = games[i][queueStartTimeKey].substr(2,2);
            queueStartTime = parseInt(queueStartHr + queueStartMin);
        }
        if(games[i][startTimeKey] != "none") {
            queueEndHr = games[i][startTimeKey].substr(0,2);
            queueEndMin = games[i][startTimeKey].substr(2,2);
            queueEndTime = parseInt(queueEndHr + queueEndMin);
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

        if((weekday === currentWeekDay || 
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)))
        {
            console.log("current: " + currentTime + " queue start: " + queueStartTime);
            if(games[i][queueStartTimeKey] != "none" && (currentTime == queueStartTime)) {
                sendMessage(games[i][id], games);
            }
        }
    }
}

function sendMessage(gameId, games) {
    var gamePos = 0;
    var channel = "";
    var gameName = "";
    var day = "";

    console.log("Sending open queue message to " + gameId);
    for(var k = 0; k < games.length; k++)
    {
        if(games[k].id == gameId){
            var channelKey = Object.keys(games[gamePos])[jSonChannel];
            channel = (games[k][channelKey] != "none") ? (games[k][channelKey]) : config.MAIN_CHANNEL;
            var nameKey = Object.keys(games[k])[jSonName];
            gameName = games[k][nameKey];
            day = games[k]["weekday"];
        }
    }

    //client.channels.cache.get(channel).send("<@&" + coachRoleId.id + ">" + " " +  "the queue for " + gameName + " Friendlies is open. "
                                            //+ "\nJoin by 2:30 for a match.");
    client.channels.cache.get(channel).send("The queue for " + gameName + " Friendlies is open. "
                                            + "\nJoin by 2:30 " + getWeekday(day) + " for a match.");
}

//checks through games array to find tournaments that are currently in progress
function getCurrentMatches() {
    //get current date
    participants = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matches.json'), 'utf-8'));
    //console.log("Checking for current matches");
    var log = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matchLog.json'), 'utf-8'));
    var teamInfoLog = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/teams.json'), 'utf-8'));

    var completeDate = (currentMonth < 10) ? (currentDay < 10 ? "0" + currentMonth.toString() + "0" + currentDay.toString() + currentYear.toString()
                                                                : "0" + currentMonth.toString() + currentDay.toString() + currentYear.toString())
                                                                : currentMonth.toString() + currentDay.toLowerCase() + currentYear.toString();
    var channelID = config.MAIN_CHANNEL;
    //scroll through game json and find all games with current day of the week or current date
    day = new Date();
    currentWeekDay = (day.getUTCHours() < 4) ? day.getUTCDay()-1: day.getUTCDay();
    currentMonth = day.getUTCMonth() + 1;
    currentDay =  (day.getUTCHours() < 4) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 3) ? day.getUTCHours() - 4 + 24 : day.getUTCHours() - 4;
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
        //console.log("Current matches for: " + games[i][id]);
        var currentTime = (currentMinutes < 10) ? parseInt(currentHour.toString() + "0" + currentMinutes.toString()):
                                                    parseInt(currentHour.toString() + currentMinutes.toString());
        var weekday = (games[i][dayKey] != "none") ? (parseInt(games[i][dayKey])) : (games[i][dayKey]);
        var date = (games[i][dateKey] != "none") ? (parseInt(games[i][dateKey])) : (games[i][dateKey]);
        var dateMonth="";
        var dateDay="";
        var dateYear="";
        if(games[i][queueEndTimeKey] != "none") {
            //console.log("queue end: " + games[i][queueEndTimeKey].substr(0,2));
            queueEndHr = games[i][queueEndTimeKey].substr(0,2);
            queueEndMin = games[i][queueEndTimeKey].substr(2,2);
            queueEndTime = parseInt(queueEndHr + queueEndMin);
        }
        if(games[i][startTimeKey] != "none") {
            //console.log("start time: " + games[i][startTimeKey].substr(0,2));
            startHr = games[i][startTimeKey].substr(0,2);
            startMin = games[i][startTimeKey].substr(2,2);
            startTime = parseInt(startHr + startMin);
        }
        if(games[i][endTimeKey] != "none") {
            //console.log("end time: " + games[i][endTimeKey].substr(0,2))
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
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)))
        {
            if(games[i][queueEndTimeKey] != "none" && (currentTime >= queueEndTime && currentTime < startTime)) {
                setMatches(games[i][id], participants, completeDate, games, log, teamInfoLog);
            }
            else if (games[i][startTimeKey] != "none" && (currentTime >= startTime && currentTime <= endTime)) {
                setMatches(games[i][id], participants, completeDate, games, log, teamInfoLog);
            }
        }
        //if start time hasn't been set the matches are released at noon
        else if((weekday === currentWeekDay ||
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear))
             && games[i][startTimeKey] === "none" && games[i][queueEndTimeKey] === "none")
        {
            setMatches(games[i][id], participants, completeDate, games, log, teamInfoLog);
        }
        //if no date or day of week has been set then adds cron job as specified game start time
        else if(weekday === "none" && date === "none" && games[i][queueEndTime] != "none") {
            setMatches(games[i][id], participants, completeDate, games, log, teamInfoLog);
        }
        else if(weekday === "none" && date === "none" && games[i][queueEndTime] === "none") {
            setMatches(games[i][id], participants, completeDate, games, log, teamInfoLog);
        }
    }
    fs.writeFile(path.join(__dirname + '/data/matches.json'), JSON.stringify(participants, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err + " matches.json issues");
        }
        else {
            scheduling = false;
            console.log("Matches reported");
        }
    });
    
    fs.writeFile(path.join(__dirname + '/data/matchLog.json'), JSON.stringify(log, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err + " matchLog.json issues");
        }
    });

    fs.writeFile(path.join(__dirname + '/data/teams.json'), JSON.stringify(teamInfoLog, null, 4), (err) =>
    {
        if (err)
        {
            client.channels.cache.get(channelID).send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err + " teams.json issues");
        }
    });
}

//Send out match notifications
function setMatches(gameId, participants, completeDate, games, log, teamInfoLog) {
    var gamePos = 0;
    var channel = "";
    var gameName = "";
    for(var j = 0; j < participants.length; j++)
    {
        if(participants[j].id == gameId)
        {
            console.log("Setting matches for " + gameId);
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

            var team1InfoPos = 0;
            var team2InfoPos = 0;
            var game1Pos = -1;
            var game2Pos = -1;
            for(var g = 0; g < teamInfoLog.length; g++)
            {
                if(teamInfoLog[g].id == team1){
                    team1InfoPos = g;
                }
                else if(teamInfoLog[g].id == team2){
                    team2InfoPos = g;
                }
            }

            if(teamInfoLog[team1InfoPos][gameId] == null){
                teamInfoLog[team1InfoPos][gameId] = JSON.parse("{}");
            }
            if(teamInfoLog[team2InfoPos][gameId] == null){
                teamInfoLog[team2InfoPos][gameId] = JSON.parse("{}");
            }
            
            for(var g = 0; g < Object.keys(teamInfoLog[team1InfoPos]).length; g++)
            {
                if(Object.keys(teamInfoLog[team1InfoPos])[g] === gameId){
                    game1Pos = g;
                    break;
                }
            }

            for(var g = 0; g < Object.keys(teamInfoLog[team2InfoPos]).length; g++)
            {
                if(Object.keys(teamInfoLog[team2InfoPos])[g] === gameId){
                    game2Pos = g;
                    break;
                }
            }
           
            team1Sets = teamInfoLog[team1InfoPos][gameId];
            team2Sets = teamInfoLog[team2InfoPos][gameId];
            teamInfoLog[team1InfoPos][gameId]["match" + Object.keys(team1Sets).length] = team2Name + " " + key;
            teamInfoLog[team2InfoPos][gameId]["match" + Object.keys(team2Sets).length] = team1Name + " " + key;
            var order = Math.floor(Math.random() * 2);
            if(order == 0){
                //console.log("random count0: " + order);
                 //console.log("channel: " + channel + " gamePos: " + gamePos + " key: " + key + " team2: " + team2);
                client.channels.cache.get(channel).send("Home: <@" + team1 + ">" + " " +  "Away: <@" + team2 + "> set up " + key + " for " + gameName + ".");
            }
            else{
                //console.log("random count1: " + order);
                 //console.log("channel: " + channel + " gamePos: " + gamePos + " key: " + key + " team2: " + team2);
                client.channels.cache.get(channel).send("Home: <@" + team2 + ">" + " " +  "Away: <@" + team1 + "> set up " + key + " for " + gameName + ".");
            }
           
            if(log[gameLogPos][completeDate] == null) {
                log[gameLogPos][completeDate] = JSON.parse("{}");
            }
            if(log[gameLogPos][completeDate][key] == null) {
                log[gameLogPos][completeDate][key] = JSON.parse("{}");
            }

            if(coachList[channel]== null){
                coachList[channel] = [];
            }
            coachList[channel].push(team1);
            coachList[channel].push(team2);
            console.log("gameLogPos: " + gameLogPos + " complete: " + completeDate + " key: " + key);
            var matchSets = log[gameLogPos][completeDate][key];
            console.log("List of coaches: " + coachList[channel])
            log[gameLogPos][completeDate][key]["match" + Object.keys(matchSets).length] = team1Name + ", " + team2Name;
        }
    }
    if(scheduling){
        //go back through and match teams with teams of other sizes
        for(var i = Object.keys(participants[gamePos]).length - 1; i > 1; i--)
        {
            const key = Object.keys(participants[gamePos])[i];
            if(Object.keys(participants[gamePos][key]).length > 0)
            {
                for(var j = i - 1; j > 0; j--){
                    const key2 = Object.keys(participants[gamePos])[j];
                    if( Object.keys(participants[gamePos][key2]).length > 0){
                        let team1 = Object.keys(participants[gamePos][key])[0];
                        let team1Name = participants[gamePos][key][team1];
                        let team2 = Object.keys(participants[gamePos][key2])[0];
                        let team2Name = participants[gamePos][key2][team2]
            
                        var team1InfoPos = 0;
                        var team2InfoPos = 0;
            
                        for(var g = 0; g < teamInfoLog.length; g++)
                        {
                            if(teamInfoLog[g].id == team1){
                                team1InfoPos = g;
                            }
                            else if(teamInfoLog[g].id == team2){
                                team2InfoPos = g;
                            }
                        }
            
                        if(teamInfoLog[team1InfoPos][gameId] == null){
                            teamInfoLog[team1InfoPos][gameId] = JSON.parse("{}");
                        }
                        if(teamInfoLog[team2InfoPos][gameId] == null){
                            teamInfoLog[team2InfoPos][gameId] = JSON.parse("{}");
                        }
                    
                        team1Sets = teamInfoLog[team1InfoPos][gameId];
                        team2Sets = teamInfoLog[team2InfoPos][gameId];
                        teamInfoLog[team1InfoPos][gameId]["match" + Object.keys(team1Sets).length] = team2Name + " " + key;
                        teamInfoLog[team2InfoPos][gameId]["match" + Object.keys(team2Sets).length] = team1Name + " " + key; 
            
                        delete participants[gamePos][key][team1];
                        delete participants[gamePos][key2][team2];
                        var order = Math.floor(Math.random() * 2);
                        if(order == 0){
                            //console.log("random count0: " + order);
                            //console.log("channel: " + channel + " gamePos: " + gamePos + " key: " + key + " team2: " + team2);
                            client.channels.cache.get(channel).send("Home: <@" + team1 + ">" + " " +  "Away: <@" + team2 + "> set up " + key2 + " for " + gameName + ".");
                        }
                        else{
                            //console.log("random count1: " + order);
                            //console.log("channel: " + channel + " gamePos: " + gamePos + " key: " + key + " team2: " + team2);
                            client.channels.cache.get(channel).send("Home: <@" + team2 + ">" + " " +  "Away: <@" + team1 + "> set up " + key2 + " for " + gameName + ".");
                        }
                       
                        if(log[gameLogPos][completeDate] == null) {
                            log[gameLogPos][completeDate] = JSON.parse("{}");
                        }
                        if(log[gameLogPos][completeDate][key2] == null) {
                            log[gameLogPos][completeDate][key2] = JSON.parse("{}");
                        }

                        if(coachList[channel]== null){
                            coachList[channel] = [];
                        }
                        coachList[channel].push(team1);
                        coachList[channel].push(team2);
                        console.log("gameLogPos: " + gameLogPos + " complete: " + completeDate + " key: " + key);
                        var matchSets = log[gameLogPos][completeDate][key2];
                        console.log("List of coaches: " + coachList[channel]);
                        log[gameLogPos][completeDate][key2]["match" + Object.keys(matchSets).length] = team1Name + ", " + team2Name;
                        break;
                    }
                }
            }
        }
        //go back through queues and remove anyone that doesn't have match w/message to requeue
        for(var i = Object.keys(participants[gamePos]).length-1; i > 0; i--)
        {
            const key = Object.keys(participants[gamePos])[i];
            var teams = participants[gamePos][key];
            if(Object.keys(participants[gamePos][key]).length > 0){
                //console.log("matching teams " + key);
                let team1 = Object.keys(participants[gamePos][key])[0];

                delete participants[gamePos][key][team1];

                //console.log("channel: " + channel + " gamePos: " + gamePos + " key: " + key + " team2: " + team2);
                client.channels.cache.get(channel).send("<@&" + coachRoleId.id + ">" + " " +  "<@" + team1 + "> needs a " + key + " match for " + gameName + "."
                                                            + "\nYou may also re-queue at 3:30pm to seek a possible match");

            }
        }
    }
    
}

function closeQueue() {
    //scroll through game json and find all games with current day of the week or current date
    day = new Date();
    currentWeekDay = (day.getUTCHours() < 4) ? day.getUTCDay()-1: day.getUTCDay();
    currentMonth = day.getUTCMonth() + 1;
    currentDay =  (day.getUTCHours() < 4) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 3) ? day.getUTCHours() - 4 + 24 : day.getUTCHours() - 4;

    console.log("repeating?");
    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const dayKey = Object.keys(games[i])[jSonWeek];
        const dateKey = Object.keys(games[i])[jSonDate];
        const endTimeKey = Object.keys(games[i])[jSonEnd];
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

        var gamePos = 0;
        var channel = "";
        var gameName = "";
        var day = "";

        
        if((weekday === currentWeekDay || 
            (currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)))
        {
            console.log("current: " + currentTime + " queue end: " + endTime + " currentweekday: " + currentWeekDay + " weekday: " + weekday);
            if(games[i][endTimeKey] != "none" && (currentTime >= endTime)) {
                console.log("Sending close queue message to " + games[i][id]);
                for(var k = 0; k < games.length; k++)
                {
                    if(games[k].id == games[i][id]){
                        var channelKey = Object.keys(games[gamePos])[jSonChannel];
                        channel = (games[k][channelKey] != "none") ? (games[k][channelKey]) : config.MAIN_CHANNEL;
                        var nameKey = Object.keys(games[k])[jSonName];
                        gameName = games[k][nameKey];
                        day = games[k]["weekday"];
                    }
                }
                if(coachList[channel] != null){
                    var coaches = coachList[channel];
                    var idList = "";
                    console.log("coaches: " + coaches);
                    if(coachList[channel].length > 0){
                        for(var j = 0; j < coachList[channel].length; j++){
                            idList += "<@" + coaches[j] + "> ";
                        }
                        coachList[channel] = [];
                        console.log("channel content" + coachList[channel]);
                        client.channels.cache.get(channel).send(idList + " please complete this survey for today's " + gameName + " friendlies match. Teams will earn points for the completion of this survey each week.\nhttps://docs.google.com/forms/d/e/1FAIpQLSdET78acLN8yjNpxeBG6cVz9SaTkwCjLXwsrqaFKl12ZlvJeg/viewform");
                    }
                    else{
                        var channelID = config.MAIN_CHANNEL;
                        client.channels.cache.get(channelID).send("```diff\n- No matches issued for " + gameName + ".```");
                    }
                }
                else{
                    var channelID = config.MAIN_CHANNEL;
                    client.channels.cache.get(channelID).send("```diff\n- No matches issued for " + gameName + ".```");
                }
                
            }
        }
    }
    schedule = false;
}

//Clear all the logs
function clearLogs(message) {
    var log = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matchLog.json'), 'utf-8'));
    log = [];
    fs.writeFile(path.join(__dirname + '/data/matchLog.json'), JSON.stringify(log, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else {
            message.channel.send("```diff\n- Logs cleared.```");
        }
    });
}

//Clear all the logs
function clearteams(message) {
    var teamInfoLog = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/teams.json'), 'utf-8'));
    teamInfoLog = [];
    fs.writeFile(path.join(__dirname + '/data/teams.json'), JSON.stringify(teamInfoLog, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else {
            message.channel.send("```diff\n- Teams cleared.```");
        }
    });
}

//Clears all queues when called to
function clearQueues() {
    console.log("Clearing queues");
    participants = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matches.json'), 'utf-8'));
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
        while(Object.keys(participants[j]).length > 2)
        {
            const key = Object.keys(participants[j])[2];
            delete participants[j][key];
        }
    }
    var channelID = config.MAIN_CHANNEL;
    fs.writeFile(path.join(__dirname + '/data/matches.json'), JSON.stringify(participants, null, 4), (err) =>
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

function testCron(setHr, setMin, wday) {
    day = new Date();
    daylightSavings = true;
    currentWeekDay = (day.getUTCHours() < 4) ? day.getUTCDay() - 1: day.getUTCDay();
    currentMonth = day.getUTCMonth()+1;
    currentDay =  (day.getUTCHours() < 4) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    if(currentMinutes + 5 )
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 3) ? day.getUTCHours() - 4 + 24 : day.getUTCHours() - 4;
    var queuetime = '00 ' + currentMinutes + ' ' + currentHour + ' * * ' + wday;
    var crontest = [];
    crontest.push(
        cron.schedule(
            queuetime,
            () => {
                var channelID = config.MAIN_CHANNEL;
                client.channels.cache.get(channelID).send("```diff\n- Cron running.```");
                crontest = [];
            }
        ), undefined, true, "UTC"
    );
    
}

//Displays queue menu in discord channel where called
function helpCommand(message)
{
    var output = "```xml";
    
    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const nameKey = Object.keys(games[i])[jSonName];
        const des = Object.keys(games[i])[jSonDes];
        const channelID = Object.keys(games[i])[jSonChannel];
        if(message.channel.id == config.MAIN_CHANNEL || message.channel.id == games[i][channelID]){
            output += ("\n**" + games[i][nameKey] + " Queue (" + games[i][id] + "}**\n");
            for(var k = 0; k < games[i][nameKey].length + games[i][id].length + 13; k++)
            {
                output += "=";
            }
            output += "\n" + games[i][des] + "\n";
        }
    }
    
    output += ("\n# Menu commands ");
    
    if(games.length == 0) {
        output += "\nNo games have been added yet";
    }
    for(var i = 0; i < menu.length; i++)
    {
        const id = Object.keys(menu[i])[1];
        const des = Object.keys(menu[i])[2];
        output += ("\n- <  " + prefix + menu[i][id] + "  >\t" + menu[i][des]);
    }
    output += "\n```";
    message.channel.send(output);
}

//#region Admin Code

//Displays admin menu in discord channel where called
function adminMenu(message)
{
    var output = "```diff";
    output += ("\n- Admin commands");
    for(var i = 0; i < admin.length; i++)
    {
        const id = Object.keys(admin[i])[1];
        const des = Object.keys(admin[i])[2];
        if(admin[i].id === "role")
            output += ("\n+ < " + prefix + admin[i][id] + " > \n\t" + admin[i][des] + config.COACH_ROLE);
        else if(admin[i].id === "default"){
            var channel = client.channels.cache.get(config.MAIN_CHANNEL);
            output += ("\n+ < " + prefix + admin[i][id] + " > \n\t" + admin[i][des] + channel.name);
        }
        else
            output += ("\n+ < " + prefix + admin[i][id] + " > \n\t" + admin[i][des]);
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

//outputs log info for each team
function outputTeamLog(message, coachId){
    var teamInfoLog = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/teams.json'), 'utf-8'));
    teamLogPos = -1;
    var coachName = "";
    for(var j = 0; j < teamInfoLog.length; j++)
    {
        if(teamInfoLog[j].id == coachId)
        {
            teamLogPos = j;
            coachName = teamInfoLog[j].name;
        }
    }
    if(teamLogPos == -1){
        message.channel.send("```diff\n- " + coachName + " team has not competed in any friendly matches.```");
        return;
    }
    var output = "```md";
    output += ("\n# Team info for " + coachName);
    
    for(var i = 2; i < Object.keys(teamInfoLog[teamLogPos]).length; i++)
    {
        var gamesKey = Object.keys(teamInfoLog[teamLogPos])[i];
        output += "\n# " + gamesKey;
        for(var j = 0; j < Object.keys(teamInfoLog[teamLogPos][gamesKey]).length; j++)
        {
            var matchKey = Object.keys(teamInfoLog[teamLogPos][gamesKey])[j];
            var teams = teamInfoLog[teamLogPos][gamesKey][matchKey];
            output += "\n- < " + matchKey + " > vs < " + teams + " >";
        }
    }
    output += "\n```";
    message.channel.send(output);
    console.log("Team log generated");
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
    console.log("Match date log generated");
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
    console.log("List generated for " + id);
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
                    console.log("Team " + coachId + " removed from " + id);
                    return;
                }
            }
        }
    }
    message.channel.send("```diff\n- There is no team in the selected queue with that id.```");
}

function postRules(message){
    message.channel.send("https://docs.google.com/document/d/1uwrmDi2go7U9fq7PO3RjmQ-uq-jnW58GSPjBtJtUrJ0");
}

function updateGameQueueDay(message, id){
    var location = -1;

    //checks to see if game exists (by id)
    for(var i = 0; i < games.length; i++)
    {
        const idKey = Object.keys(games[i])[0];
        if(games[i][idKey] == id)
        {
            location = i;
            break;
        }
    }
    if(location == -1){
        message.channel.send("```diff\n- Error: Game doesn't exist.```");
        return;
    }

    console.log("game found");

    //Get current game info
    var gameName = games[location]["name"];
    var gameChannel = games[location]["channel"];
    var gameDes = games[location]["des"];
    var gameMax = games[location]["max teams"];
    var gameWeekday = games[location]["weekday"];
    var gameDate = games[location]["date"];
    var gameQStart = games[location]["queue start"];
    var gameQEnd = games[location]["queue end"];
    var gameStart = games[location]["start time"];
    var gameEnd = games[location]["end time"];

    games.splice(location, 1);

    console.log(gameName + " information received");

    console.log("des" + gameDes);
    //if game doesn't exist create a file in games.json
    games.push(JSON.parse("{\"" + "id" + "\":\"" + id 
                            +"\", \n\"name\": \"" + gameName
                            + "\", \n\"channel\": \"" + gameChannel
                            + "\", \n\"des\": \"" + "none"
                            + "\", \n\"max teams\": \"" + gameMax
                            + "\", \n\"weekday\": \"" + gameWeekday
                            + "\", \n\"queue weekday\": \"" + gameWeekday
                            + "\", \n\"date\": \"" + gameDate 
                            + "\", \n\"queue start\": \"" + gameQStart
                            + "\", \n\"queue end\": \"" + gameQEnd
                            + "\", \n\"start time\": \"" + gameStart 
                            + "\", \n\"end time\": \"" + gameEnd + "\"}"));
    
                            //update games.json with new games array file
    fs.writeFile(path.join(__dirname + '/data/games.json'), JSON.stringify(games, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else {
            message.channel.send("```diff\n+ Game updated (" + gameName + ").```");
            addDes(message, id, gameDes);
        }
    });

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
                            + "\", \n\"queue weekday\": \"" + "none"
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
    console.log("weekday: " + games[index]["weekday"]);
    console.log("queue weekday: " + games[index]["queue weekday"]);
    games[index]["queue weekday"] = (dayOfWeek === "none") ? ("none" ) : (parseInt(dayOfWeek) - 1).toString();
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

    const queueEndHr = parseInt(queueEnd.substr(0,2));
    const queueEndMin = parseInt(queueEnd.substr(2,2));

    const weekdayKey = Object.keys(games[index])[jSonWeek];
    var qthisWeekday = games[index][weekdayKey];
    var queueHr = queueEndHr - Math.floor(Number(queueTime));
    var days = 0;
    if(queueHr < 0){
        days = Math.floor(Math.abs(queueHr)/24) + 1;
        var time = Math.abs(queueHr) % 24;
        queueHr = 24 - time;
    }

    console.log("computation: " + (parseInt((Number(queueTime) - parseInt(Number(queueTime)))*60.0)));
    var queueMin = queueEndMin - (parseInt((Number(queueTime) - parseInt(Number(queueTime)))*60.0));
    console.log("end queue time: " + queueEndMin);
    if(queueMin < 0){
        queueMin += 60;
        queueHr -= 1;
        if(queueHr < 0){
            queueHr = 23;
            days += 1;
        }
    }

    games[index]["queue weekday"] = (qthisWeekday - days >= 0) ? String(qthisWeekday - days) : String(qthisWeekday - days + 7);

    console.log("qWeekday: " + qthisWeekday);
    console.log("days: " + days);
    console.log("queueHr: " + queueHr);
    console.log("queueMin: " + queueMin);
    console.log("queueTime: " + parseFloat(queueTime));

    const startTimeKey = Object.keys(games[index])[jSonStart];
    const startTime = games[index][startTimeKey];

    if(parseFloat(queueTime) <= 0 || queueHr < 0 || queueHr > 23 
        || queueMin < 0 || queueMin > 59) {
        message.channel.send("```diff\n- Error1: Inputted time is not valid, please use a valid time in the format HHMM or none for no time, example: 8:45 = 0845.```");
        return;
    }
    else if(queueEnd.length < 4 || queueEnd.length > 4 || queueEndHr < 0 || queueEndHr > 23 
        || queueEndMin < 0 || queueEndMin > 59 || isNaN(queueEndHr) || isNaN(queueEndMin)) {
        message.channel.send("```diff\n- Error2: Inputted time is not valid, please use a valid time in the format HHMM or none for no time, example: 8:45 = 0845.```");
        return;
    }
    else if(parseInt(queueEnd) > parseInt(startTime)) {
        message.channel.send("```diff\n- Error3: Queue time cannot come after start time, please use a valid time in the format HHMM, example: 8:45 = 0845.```");
        return;
    }
    
    const queueHrString = (queueHr < 10) ? "0" + String(queueHr) : String(queueHr);
    const queueMinString = (queueMin < 10) ? "0" + String(queueMin) : String(queueMin);
    games[index]["queue start"] = queueHrString + queueMinString;
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
            clearCrons();
        }
    });
}

//Add start and end times for queue to be available, none can be entered for start, end or both for no restrictions
function addTime(message, id, start, end) {
    var index = games.findIndex(a=> a.id === id);
    if(index < 0) {
        message.channel.send("```diff\n- Error: id does not exist, check !menu for the list of games.```");
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
    else if(parseInt(queueEndTime) > parseInt(start)) {
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
            clearCrons();
        }
    });
}

function printGames(message){
    var output = "```md";
    output += ("\n# Games");
    //Lists all registered games in games.json
    for(var i = 0; i < games.length; i++)
    {
        output += "\n- < " + games[i]["id"] + " > " + games[i]["name"];
    }
    output += "\n```";
    message.channel.send(output);
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
        else if(key === "queue weekday") {
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

//Adds team to teams array for logging team info
function addTeamInfo(message, coachId, name, gameId) {
    var teamInfoLog = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/teams.json'), 'utf-8'));

    //checks to see if team already exists (by id)
    for(var i = 0; i < teamInfoLog.length; i++)
    {
        const idKey = Object.keys(teamInfoLog[i])[0];
        if(teamInfoLog[i][idKey] == coachId)
        {
            return;
        }
    }
    console.log("name: " + name + " id: " + coachId);
    //if game doesn't exist create a file in teams.json
    teamInfoLog.push(JSON.parse("{\"" + "id" + "\":\"" + coachId 
                            +"\", \n\"name\": \"" + name 
                            + "\", \n\"" + gameId + "\": " + "{}"
                            + " }"));

    //update teams.json with new team file
    fs.writeFile(path.join(__dirname + '/data/teams.json'), JSON.stringify(teamInfoLog, null, 4), (err) =>
    {
        if (err)
        {
            message.channel.send("```diff\n- Internal error occured, could not write to config file.```");
            console.log(err);
        }
        else
        {
            console.log("Team log info added");
        }
    });
}

//add team to queue if the time/date/max teams conditions are met
function addToQueue(message, id, game, numTeams) {
    //Get game info
    var gameList = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/games.json'), 'utf-8'));
    const gameName = gameList[game]["name"];
    const channelKey = Object.keys(gameList[game])[jSonChannel];
    const dayKey = Object.keys(gameList[game])[jSonWeek];
    const qDayKey = Object.keys(gameList[game])[jSonQWeek];
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
    var queueWeekday = (gameList[game][qDayKey] != "none") ? (parseInt(gameList[game][qDayKey])) : (gameList[game][qDayKey]);
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
    if((queueWeekday === "none" && date === "none") 
        || (currentWeekDay >= queueWeekday && currentWeekDay <= weekday)
        || (currentMonth + 1 == dateMonth && currentDay == dateDay && currentYear == dateYear)) {
            //fix this to work for multiple days
        if((currentWeekDay == queueWeekday && currentTime >= queueTime) || (currentWeekDay == weekday && currentTime <= queueEndTime) 
            || (currentTime >= startTime && currentTime <= endTime)
            || (currentWeekDay == queueWeekday && currentTime >= queueTime && queueEndTime === "none")
            || (queueTime === "none" && endTime === "none")) {
                gameQ(message, id, gameList[game][nameKey], numTeams);
        }
        else {
            var messageTxt = (queueTime != "none" && endTime != "none") ? 
                ("```diff\n- Queue time for " + gameName + " starts at " + queueTime + " and ends at " + queueEndTime + " it will reopen at " + startTime + ", current time is " + currentTime + "```") :
                (queueTime != "none") ? ("```diff\n- Queue time for " + gameName + " starts at " + queueTime + " the time currently is " + currentTime + "```") :
                ("```diff\n- Queue time for " + gameName + " ended at " + queueEndTime + "```");
            message.channel.send(messageTxt);
            return;
        }
    }
    //One or more of the conditions have not been met, output queue window to clarify availability to user
    else
    {
        var messageTxt = (queueWeekday === "none" && queueTime != "none" && endTime != "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " from " + queueTime + " to " + queueEndTime + "```") :

                    (queueWeekday === "none" && queueTime === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + "```") :
                    
                    (queueWeekday === "none" && queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " until " + queueEndTime + "```") :

                    (queueWeekday === "none" && endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + dateMonth + "-" + dateDay + "-" + dateYear + " starting at " + queueTime + "```") :

                    (endTime === "none" && queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(queueWeekday.toString()) + "s```"):

                    (queueTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(queueWeekday.toString()) + "s until " + queueEndTime + "```") :

                    (endTime === "none") ? ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(queueWeekday.toString()) + "s starting at " + queueTime + "```"):

                    ("```diff\n- "+ gameName + " queue is open on " 
                    + getWeekday(queueWeekday.toString()) + "s from " + queueTime + " to " + queueEndTime +  "```");

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
    participants = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/matches.json'), 'utf-8'));
    games = JSON.parse(fs.readFileSync(path.join(__dirname + '/data/games.json'), 'utf-8'));
    numGames = games.length;
    clearCrons();
    let scheduledMessage = new cron.schedule('00 00 07 * * 0', () => {
    // This runs every Sunday at 03:00:00 to set tournament start schedule
        clearQueues();
        //set queues for today
    });
    scheduledMessage.start()
    let scheduledCrons = new cron.schedule('00 00 08 * * *', () => {
    // This runs every day at 04:00:00 to set tournament start schedule
        clearCrons();
    });
    scheduledCrons.start()
});

function clearCrons(){
    for(var i = 0; i < cronJobs.length; i++)
    {
        //console.log("destroying: " + cronJobs[i]);
        if(cronJobs[i] != null && cronJobs[i] != true && cronJobs[i] != false && cronJobs[i] != "UTC")
            cronJobs[i].destroy();
    }
    cronJobs = [];
    queueList = [];
    scheduleStartTime();
}

function dayLight()
{
    Date.prototype.stdTimezoneOffset = function () {
        var jan = new Date(this.getFullYear(), 0, 1);
        var jul = new Date(this.getFullYear(), 6, 1);
        return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    }
    
    Date.prototype.isDstObserved = function () {
        return this.getTimezoneOffset() < this.stdTimezoneOffset();
    }
    
    var today_string = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    var today = new Date(today_string);
    //if (today.isDstObserved()) { 
    //    daylightSavings = true;
    //    currentHour += 1;
    //    console.log("it's daylight savingings");
    //}

    let jan_date_string = new Date(today.getFullYear(), 0, 1).toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    let today_date_string = new Date(today.getFullYear(), today.getMonth(), today.getDate());
   
    
    let jan_date = new Date(jan_date_string).getTimezoneOffset();
    let today_date = new Date(today_date_string).getTimezoneOffset();
    console.log("jan time is: " + jan_date);
    console.log("current time is: " + today_date);
    daylightSavings = true;
    //currentHour += 1;
    console.log("it's daylight savings");
}

function scheduleStartTime() {
    //scroll through game json and find all games with current day of the week or current date    
    day = new Date();
    daylightSavings = false;
    currentWeekDay = (day.getUTCHours() < 4) ? day.getUTCDay() - 1: day.getUTCDay();
    currentMonth = day.getUTCMonth()+1;
    currentDay =  (day.getUTCHours() < 4) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 3) ? day.getUTCHours() - 4 + 24 : day.getUTCHours() - 4;
    console.log("number of jobs: " + cronJobs.length);
    
    
    for(var i = 0; i < games.length; i++)
    {
        const id = Object.keys(games[i])[jSonId];
        const dayKey = Object.keys(games[i])[jSonWeek];
        const qDayKey = Object.keys(games[i])[jSonQWeek];
        const dateKey = Object.keys(games[i])[jSonDate];
        const matchTimeKey = Object.keys(games[i])[jSonQueueEnd];
        const openQueueKey = Object.keys(games[i])[jSonQueue];
        const stopTimeKey = Object.keys(games[i])[jSonEnd];
        var startHr="";
        var startMin="";
        var endHr="";
        var endMin="";
        var weekday = (games[i][dayKey] != "none") ? (parseInt(games[i][dayKey])) : (games[i][dayKey]);
        var qWeekday = (games[i][qDayKey] != "none") ? (parseInt(games[i][qDayKey])) : (games[i][qDayKey]);
        var date = (games[i][dateKey] != "none") ? (parseInt(games[i][dateKey])) : (games[i][dateKey]);
        var dateMonth="";
        var dateDay="";
        var dateYear="";
        //times are dealt with here too
        if(games[i][matchTimeKey] != "none") {
            var sTime = 0;
            if(parseInt(games[i][matchTimeKey].substr(0,2)) >= 20) {
                sTime = (parseInt(games[i][matchTimeKey].substr(0,2)) - 20)
                startHr = "0" + sTime.toString();
            }
            else{
                sTime = (parseInt(games[i][matchTimeKey].substr(0,2)) + 4)
                if(sTime < 10){
                    startHr = "0" + sTime.toString();
                }
                else {
                    startHr = sTime.toString();
                }
            }
            var eTime = 0;
            if(parseInt(games[i][stopTimeKey].substr(0,2)) >= 20) {
                eTime = (parseInt(games[i][stopTimeKey].substr(0,2)) - 20)
                endHr = "0" + eTime.toString();
            }
            else{
                eTime = (parseInt(games[i][stopTimeKey].substr(0,2)) + 4)
                if(eTime < 10){
                    endHr = "0" + eTime.toString();
                }
                else {
                    endHr = eTime.toString();
                }
            }
            startMin = games[i][matchTimeKey].substr(2,2);
            endMin = games[i][stopTimeKey].substr(2,2);
            console.log(games[i].id + " time: " + startHr + " " + startMin + " end time: " + endHr + " " + endMin);
        }

        //get queue open time
        if(games[i][openQueueKey] != "none") {
            var qTime = 0;
            if(parseInt(games[i][openQueueKey].substr(0,2)) >= 20) {
                qTime = (parseInt(games[i][openQueueKey].substr(0,2)) - 20)
                openHr = "0" + qTime.toString();
            }
            else{
                qTime = (parseInt(games[i][openQueueKey].substr(0,2)) + 4)
                if(qTime < 10){
                    openHr = "0" + qTime.toString();
                }
                else {
                    openHr = qTime.toString();
                }
            }
            openMin = games[i][openQueueKey].substr(2,2);
            console.log(games[i].id + " Queue open time: " + openHr + " " + openMin);
        }

        if(date != "none") {
            dateMonth = parseInt(games[i][dateKey].substr(0,2));
            dateDay = parseInt(games[i][dateKey].substr(2,2));
            dateYear = parseInt(games[i][dateKey].substr(4,4));
            console.log("the date is " + dateMonth + " " + dateDay + " " + dateYear);
        }   
        console.log(games[i].id + " Queue Weekday: " + qWeekday + " Weekday: " + weekday 
                                + " currentweekday: " + currentWeekDay + " game time: " + games[i][matchTimeKey]);
        //add cron job to release matches at game's specified start time
        if((currentMonth == dateMonth && currentDay == dateDay && currentYear == dateYear)
            && games[i][matchTimeKey] != "none")
        {
            var queuetime = '00 ' + openMin + ' ' + openHr + ' * * ' + qWeekday;
            if(queueList.indexOf(queuetime) < 0){
                console.log("Setting " + games[i].id + " cron for open queue: " + openHr + ":" + openMin + " weekday: " + qWeekday);
                queueList.push(queuetime);
                cronJobs.push(
                    new cron.schedule(
                        queuetime,
                        () => {
                            
                                console.log("Running cron for open queue time, weekday = " + qWeekday);
                                openQueue();
                            
                        }
                    ), undefined, true, "UTC"
                );
            }
            console.log("Setting " + games[i].id + " cron for: " + startHr + ":" + startMin + " Weekday: " + weekday);
            var time = '00 ' + startMin + ' ' + startHr + ' * * ' + weekday;
            cronJobs.push(
                new cron.schedule(
                    time,
                    () => {
                        if(!scheduling){
                            console.log("Running cron for set time, weekday = " + weekday);
                            scheduling = true;
                            getCurrentMatches();
                        }
                    }
                ), undefined, true, "UTC"
            );
            console.log("Setting " + games[i].id + "  stop time for: " + endHr + ":" + endMin + " Weekday: " + weekday);
            var time = '00 ' + endMin + ' ' + endHr + ' * * ' + weekday;
            cronJobs.push(
                new cron.schedule(
                    time,
                    () => {
                        if(!scheduling){
                            console.log("Running cron for set stop time, weekday = " + weekday);
                            scheduling = true;
                            closeQueue();
                        }
                    }
                ), undefined, true, "UTC"
            );
            //console.log("Schedule set for " + games[i][id]);
        }
        else if(games[i][matchTimeKey] != "none")
        {
            var queuetime = '00 ' + openMin + ' ' + openHr + ' * * ' + qWeekday;
            if(queueList.indexOf(queuetime) < 0){
                console.log("Setting " + games[i].id + " cron for open queue: " + openHr + ":" + openMin + " weekday: " + qWeekday);
                queueList.push(queuetime);
                cronJobs.push(
                    new cron.schedule(
                        queuetime,
                        () => {
                            
                                console.log("Running cron for open queue time, weekday = " + qWeekday);
                                openQueue();
                            
                        }
                    ), undefined, true, "UTC"
                );
            }
            console.log("Setting " + games[i].id + " cron for: " + startHr + ":" + startMin + " Weekday: " + weekday);
            var time = '00 ' + startMin + ' ' + startHr + ' * * ' + weekday;
            cronJobs.push(
                new cron.schedule(
                    time,
                    () => {
                        if(!scheduling){
                            console.log("Running cron for set time, weekday = " + weekday);
                            scheduling = true;
                            getCurrentMatches();
                        }
                    }
                ), undefined, true, "UTC"
            );
            console.log("Setting " + games[i].id + " stop time for: " + endHr + ":" + endMin + " Weekday: " + weekday);
            var time = '00 ' + endMin + ' ' + endHr + ' * * ' + weekday;
            cronJobs.push(
                new cron.schedule(
                    time,
                    () => {
                        console.log("scheduling: " + scheduling);
                        if(!scheduling){
                            console.log("Running cron for set stop time, weekday = " + weekday);
                            scheduling = true;
                            closeQueue();
                        }
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
                new cron.schedule(
                    '00 00 12 * * ' + weekday,
                    () => {
                        console.log("Running cron at noon, on weekday = " + weekday);
                        getCurrentMatches();
                    }
                ), undefined, true, "UTC"
            );
        }
        //if no date or day of week has been set then adds cron job as specified game start time
        else if(weekday === "none" && date === "none" && games[i][matchTimeKey] != "none") {
            console.log("Setting cron for: " + startHr + ":" + startMin);
            var time = '00 ' + startMin + ' ' + startHr + ' * * *';
            cronJobs.push(
                new cron.schedule(
                    time,
                    () => {
                        console.log("Running cron for set start time");
                        getCurrentMatches();
                    }
                ), undefined, true, "UTC"
            );
        }
        else if(weekday === "none" && date === "none" && games[i][matchTimeKey] === "none") {
            cronJobs.push(
                new cron.schedule(
                    '00 00 12 * * *',
                    () => {
                        console.log("Running cron at noon no date");
                        getCurrentMatches();
                    }
                ), undefined, true, "UTC"
            );
        }
    }
    //add each game's start time to the cron job as long as the start time isn't "none"
    console.log("Number of queues: " + queueList.length);
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
    currentWeekDay = (day.getUTCHours() < 4) ? day.getUTCDay() - 1: day.getUTCDay();
    currentMonth = day.getUTCMonth()+1;
    currentDay =  (day.getUTCHours() < 4) ? day.getUTCDate() - 1: day.getUTCDate();
    currentYear = day.getUTCFullYear();
    currentMinutes = day.getUTCMinutes();
    currentHour = (day.getUTCHours() >= 0 && day.getUTCHours() <= 3) ? day.getUTCHours() - 4 + 24 : day.getUTCHours() - 4;

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

    //Get coach role id
    coachRoleId = message.guild.roles.cache.find(role => role.name == config.COACH_ROLE);

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
        if(admin[i][command] === call || call === "clearqueues" || call === "gettime" 
            || call === "clearlogs" || call === "clearteams" || call === "croncheck" || call === "updategame" || call === "close")
        {
            adminCommand = i;
            adminFound = true;
            //console.log("admin command");
            break;
        }
    }
    
    if(call === "menu") {   //calls to help menu display
        helpCommand(message);
    }
    else if (call == "admin") { //checks if user has admin privileges, if does calls to admin menu display
        if (!hasPermission(message, "Botmom"))
        {
            message.channel.send("```diff\n- You must be an admin to use admin commands.```");
            return;
        }
        adminMenu(message);
    }
    else if(adminFound && args.length >= 0) { //checks if user has admin privileges, if does processes command
        if (!hasPermission(message, "Botmom"))
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
            case "games":
                printGames(message);
                break;
            case "log":
                if(args.length < 2){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                outputMatches(message, args.shift().toLowerCase(), args.join(" "));
                break;
            case "team":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                outputTeamLog(message, args.join(" "));
                break;
            case "release":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                scheduling = true;
                getCurrentMatches();
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
            case "updategame":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                console.log("updating game");
                updateGameQueueDay(message, args.shift().toLowerCase());
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
            case "clearlogs":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                if(args.join(" ") === "admin"){
                    clearLogs(message);
                }
                else
                    message.channel.send("```diff\n- Invalid password.```");
                break;
            case "clearteams":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                if(args.join(" ") === "admin"){
                    clearteams(message);
                }
                else
                    message.channel.send("```diff\n- Invalid password.```");
                break;
            case "croncheck":
                if(args.length < 3){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
               
                testCron(args.shift().toLowerCase(), args.shift(), args.join(" "));
                break;
            case "close":
                if(args.length < 1){
                    message.channel.send("```diff\n- Invalid number of arguments.```");
                    return;
                }
                if(args.join(" ") === "admin"){
                    closeQueue();
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
        else if(call === "rules" && args.length < 1) {
            postRules(message);
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
