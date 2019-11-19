# Cryptocurrency-getkeys
Simple Node.js application to save addresses and private keys from a cryptocurrency wallet.\
// Optional - save complete walletDump file

> Installation
1. Clone this repository -> "git clone https://github.com/ChristianGrieger/Cryptocurrency-getkeys/"
2. Change the folder permissions and make them writeable -> "chmod 777 keys" and "chmod 777 walletdumps"
3. Install the package.json dependencies -> "npm install"
4. Edit the index.js file and set the config variables on top of the file
5. Run the script -> node index.js

> Automation
1. Install pm2 (https://www.npmjs.com/package/pm2)
2. Add the index.js to the pm2 list -> "pm2 start index.js --no-autorestart --name=getkeys"
3. Add a cronjob to the crontab -> "40 10 * * * /path/to/node /path/to/pm2 restart getkeys"
