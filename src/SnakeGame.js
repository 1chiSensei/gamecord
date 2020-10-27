const Discord = require('discord.js');
const { EventEmitter } = require('events');
const { words } = require('./utils');
const WIDTH = 15;
const HEIGHT = 10;
const gameBoard = [];
const apple = { x: 1, y: 1 };

class SnakeGame{

    constructor(message, options={}){
        if(!message) throw new Error('missing message param!'); 
        this.message = message;
        this.snake = [{ x: 5, y: 5 }];
        this.snakeLength = 1;
        this.score = 0;
        this.gameEmbed = null;
        this.inGame = false;
        this.event = new EventEmitter();
        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                gameBoard[y * WIDTH + x] = "🟦";
            }
        }

        this.options = {
            title: 'Snake Game',
            color: 'RANDOM',
            gameOverTitle: 'Game Over',
            ...options
        };
    };

    gameBoardToString() {
        let str = ""
        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                if (x == apple.x && y == apple.y) {
                    str += "🍎";
                    continue;
                }

                let flag = true;
                for (let s = 0; s < this.snake.length; s++) {
                    if (x == this.snake[s].x && y == this.snake[s].y) {
                        str += "🟩";
                        flag = false;
                    }
                }

                if (flag)
                    str += gameBoard[y * WIDTH + x];
            }
            str += "\n";
        }
        return str;
    }

    isLocInSnake(pos) {
        return this.snake.find(sPos => sPos.x == pos.x && sPos.y == pos.y);
    };

    newAppleLoc() {
        let newApplePos = { x: 0, y: 0 };
        do {
            newApplePos = { x: parseInt(Math.random() * WIDTH), y: parseInt(Math.random() * HEIGHT) };
        } while (this.isLocInSnake(newApplePos))

        apple.x = newApplePos.x;
        apple.y = newApplePos.y;
    }

    run(){
        if(this.inGame) return;

        this.inGame = true;
        this.score = 0;
        this.snakeLength = 1;
        this.snake = [{ x: 5, y: 5 }];
        this.newAppleLoc();

        this.message.channel.send({
            embed: {
                title: this.options.title,
                color: this.options.color,
                description: this.gameBoardToString(),
                timestamp: Date.now()
            }
        }).then(message => {
            this.gameEmbed = message;
            this.gameEmbed.react('⬅️');
            this.gameEmbed.react('⬆️');
            this.gameEmbed.react('⬇️');
            this.gameEmbed.react('➡️');
            this.gameEmbed.react('❌');

            this.waitForReaction();
        })
    }

    step() {
        if (apple.x == this.snake[0].x && apple.y == this.snake[0].y) {
            this.score += 1;
            this.snakeLength++;
            this.newAppleLoc();
        }

        const editEmbed = new Discord.MessageEmbed()
            .setColor(this.options.color)
            .setTitle(this.options.title)
            .setDescription(this.gameBoardToString())

        this.gameEmbed.edit(editEmbed);

        this.waitForReaction();
    }

    gameOver() {
        this.inGame = false;
        const editEmbed = new Discord.MessageEmbed()
            .setColor(this.options.color)
            .setTitle(this.options.gameOverTitle)
            .setDescription("SCORE: " + this.score)

        this.gameEmbed.edit(editEmbed);

        this.gameEmbed.reactions.removeAll()
    }

    filter(reaction, user) {
        return ['⬅️', '⬆️', '⬇️', '➡️', '❌'].includes(reaction.emoji.name) && user.id !== this.gameEmbed.author.id;
    }

    waitForReaction() {
        this.gameEmbed.awaitReactions((reaction, user) => this.filter(reaction, user), { max: 1, time: 60000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();

                const snakeHead = this.snake[0];
                const nextPos = { x: snakeHead.x, y: snakeHead.y };
                if (reaction.emoji.name === '⬅️') {
                    let nextX = snakeHead.x - 1;
                    if (nextX < 0)
                        nextX = WIDTH - 1;
                    nextPos.x = nextX;
                }
                else if (reaction.emoji.name === '⬆️') {
                    let nextY = snakeHead.y - 1;
                    if (nextY < 0)
                        nextY = HEIGHT - 1;
                    nextPos.y = nextY;
                }
                else if (reaction.emoji.name === '⬇️') {
                    let nextY = snakeHead.y + 1;
                    if (nextY >= HEIGHT)
                        nextY = 0;
                    nextPos.y = nextY;
                }
                else if (reaction.emoji.name === '➡️') {
                    let nextX = snakeHead.x + 1;
                    if (nextX >= WIDTH)
                        nextX = 0;
                    nextPos.x = nextX;
                }
                else if (reaction.emoji.name === '❌') {
                    this.gameOver();
                }

                reaction.users.remove(reaction.users.cache.filter(user => user.id !== this.gameEmbed.author.id).first().id).then(() => {
                    if (this.isLocInSnake(nextPos)) {
                        this.gameOver();
                    }
                    else {
                        this.snake.unshift(nextPos);
                        if (this.snake.length > this.snakeLength)
                            this.snake.pop();

                        this.step();
                    }
                });
            })
            .catch(collected => {
                this.gameOver();
            });
    }

    setTitle(title){
        this.options.title = title;
        return this;
    };

    setColor(color){
        this.options.color = color;
        return this;
    };

    setGameOverTitle(title){
        this.options.gameOverTitle = title;
        return this;
    };

    on(event, callback){
        this.event.on(event, callback);
        return this;
    };
}

module.exports = SnakeGame;