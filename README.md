# MatchBot

**MatchBot** is a lightweight, real-time Discord bot designed to streamline matchmaking for scholastic esports programs. Created as the precursor to a more expansive Django-based web platform now used statewide, MatchBot provided a critical stepping stone by solving real-world logistics problems for coaches managing multiple esports titles.

This project demonstrates practical use of Node.js, WebSockets, Discord bot integration, and queue-based matchmaking logic to coordinate matches in a live, competitive environment.

## Purpose

MatchBot was developed to help scholastic esports organizations quickly and efficiently pair teams for competition. The bot automated what had previously been a manual and time-consuming process for coaches and league administrators.

## How It Works

- **Queue System**  
  Coaches use Discord commands to enter their teams into matchmaking queues for supported game titles.

- **Automated Matchmaking**  
  At a configured cutoff time, the bot scans each queue and pairs teams based on availability and game title.

- **Instant Notifications**  
  Match information is pushed directly to participating coaches via Discord, including opponent details using Discord handles.

- **Game-Agnostic Support**  
  Easily configure supported games and queue structures via editable JSON files.

## Features

- Discord bot integration with real-time command handling
- Queue-based matchmaking for multiple game titles
- Scheduled automatic match generation
- Coach notifications sent via Discord tags
- Easily editable configuration files
- WebSocket support for live interactions
- Minimal setup and simple UX for non-technical users

## Technologies Used

- **Node.js** – Runtime environment
- **JavaScript** – Main development language
- **Discord.js** – Bot framework for Discord
- **JSON** – Config and data storage
- **WebSockets** – Real-time match coordination
- **GitHub Actions** – CI/CD automation

## Background
MatchBot was created by an educator and software developer with years of experience managing high school esports programs. This tool was developed to eliminate repetitive manual tasks and provide a real-time solution to managing matches.

What started as a Discord bot grew into a larger statewide platform now used by over 295 schools. This project reflects a deep understanding of the challenges faced by educators and the practical application of software to solve them.

## About This Repo
This repository contains selected portions of the original MatchBot codebase and is intended to highlight experience with:
- Building and deploying Discord bots
- Managing real-time user interactions
- Automating logistics for education-based programs
- Working with Node.js and GitHub CI/CD
