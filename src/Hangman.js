/**
 * Hangcord game generator
 */

const { EventEmitter } = require('events');

const utils = require('./utils/index');
const possibleWords = utils.words;

const letterEmojisMap = {
    "🅰️": "A", "🇦": "A", "🅱️": "B", "🇧": "B", "🇨": "C", "🇩": "D", "🇪": "E",
    "🇫": "F", "🇬": "G", "🇭": "H", "ℹ️": "I", "🇮": "I", "🇯": "J", "🇰": "K", "🇱": "L",
    "Ⓜ️": "M", "🇲": "M", "🇳": "N", "🅾️": "O", "⭕": "O", "🇴": "O", "🅿️": "P",
    "🇵": "P", "🇶": "Q", "🇷": "R", "🇸": "S", "🇹": "T", "🇺": "U", "🇻": "V", "🇼": "W",
    "✖️": "X", "❎": "X", "❌": "X", "🇽": "X", "🇾": "Y", "💤": "Z", "🇿": "Z"
};

const letterEmojisMapKeys = Object.keys(letterEmojisMap);

class HangmanGame{

    constructor(message, options={}){ 
        if(!message) throw new Error('missing message param!'); 

        this.message = message;
        this.inGame = false;
        this.word = null;
        this.hint = null;
        this.guessed = [];
        this.wrongs = 0;
        this.gameEmbed = null;
        this.event = new EventEmitter();

        this.options = {
            words: possibleWords,
            title: 'Hangman',
            color: 'RANDOM',
            gameOverTitle: 'Game Over',
            ...options
        };
    };

    run(){
        if(this.inGame) return;

        this.inGame = true;
        this.word = this.options.words[Math.floor(Math.random() * this.options.words.length)].toUpperCase();
        this.hint = '`' + utils.quiz(this.word) + '`';

        this.message.channel.send({
            embed: {
                title: this.options.title,
                color: this.options.color,
                description: this.getDescription(),
                timestamp: Date.now(),
                fields: [
                    { name: 'Letters guessed', value: this.guessed.length == 0 ? '\u200b' : this.guessed.join(" "), inline: false },
                    { name: 'Hint', value: this.hint, inline: false }
                ],
                footer: {
                    text: 'React to this message using the emojis that look like letters'
                }
            }
        }).then(message => {
            this.gameEmbed = message;
            this.waitForReaction()
        });
    };

    waitForReaction(){
        this.gameEmbed.awaitReactions(() => true, { max: 1, time: 300000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                this.makeGuess(reaction.emoji.name);
                reaction.remove();
            })
            .catch(err => this.gameOver());
    };

    getDescription() {
        return "```"
            + "|‾‾‾‾‾‾|   \n|     "
            + (this.wrongs > 0 ? "🎩" : " ")
            + "   \n|     "
            + (this.wrongs > 1 ? "😟" : " ")
            + "   \n|     "
            + (this.wrongs > 2 ? "👕" : " ")
            + "   \n|     "
            + (this.wrongs > 3 ? "🩳" : " ")
            + "   \n|    "
            + (this.wrongs > 4 ? "👞👞" : " ")
            + "   \n|     \n|__________\n\n"
            + this.word.split("").map(l => this.guessed.includes(l) ? l : "_").join(" ")
            + "```";
    };

    makeGuess(reaction) {
        if (letterEmojisMapKeys.includes(reaction)) {
            const letter = letterEmojisMap[reaction];

            if (!this.guessed.includes(letter)) {
                this.guessed.push(letter);

                if (this.word.indexOf(letter) == -1) {
                    this.wrongs++;

                    if (this.wrongs == 6) this.gameOver();
                }
                else if (!this.word.split("").map(l => this.guessed.includes(l) ? l : "_").includes("_")) this.gameOver(true);
            }
        }

        if (this.inGame) {
            this.gameEmbed.edit({
                embed: {
                    title: this.options.title,
                    color: this.options.color,
                    description: this.getDescription(),
                    timestamp: Date.now(),
                    fields: [
                        { name: 'Letters guessed', value: this.guessed.length == 0 ? '\u200b' : this.guessed.join(" "), inline: false },
                        { name: 'Hint', value: this.hint, inline: false }
                    ],
                    footer: {
                        text: 'React to this message using the emojis that look like letters'
                    }
                }
            });

            this.waitForReaction();
        };
    };

    gameOver(win) {
        this.inGame = false;
        
        this.gameEmbed.edit({
            embed: {
                title: this.options.gameOverTitle,
                color: this.options.color,
                description: `**${win ? 'You won!' : 'You lost!'}**\n**The Word:** ${this.word}`,
                timestamp: Date.now()
            }
        });

        this.event.emit('end', {
            user: this.message.author,
            message: this.message,
            win
        });

        this.gameEmbed.reactions.removeAll();
    };


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

    setWords(words){
        if(!Array.isArray(words)) throw new Error('invalid set of words');
        this.options.words = words;
        return this;
    };

    pushWords(words){
        if(!Array.isArray(words)) throw new Error('invalid set of words');
        this.options.words = this.options.words.concat(words);
        return this;
    };

    on(event, callback){
        this.event.on(event, callback);
        return this;
    };

};

module.exports = HangmanGame;