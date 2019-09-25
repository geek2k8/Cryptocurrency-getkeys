//////////////////
// Simple Node.js application to save addresses and private keys from a cryptocurrency wallet
// Optional - save complete walletDump file
//////////////////

var debug = false; // Console error logging true or false

var configs = [];
// Add a push for each wallet that should be saved
// [Server, User, Password, Port, WalletPassphrase, SSL, SSL strict, Certificate path, Symbol/Name]
// Server -> Wallet server address
// User -> Wallet login username
// Password -> Wallet login password
// Port -> Wallet port
// WalletPassphrase -> *Optional* Wallet encryption password or false 
// SSL -> *Optional* Use SSL/TLS -> true/false
// SSL strict -> *Optional* Use SSL/TLS strict mode -> true/false
// Certificate path -> *Optional* Certificate path or false <- If defined strict mode is automated enabled
// Symbol/Name -> Coin symbol/name for log file
configs.push(["127.0.0.1","User","Password",8101,false,false,false,false,'CoinName']);

// Enable if also a coin.walletdump should be saved // Wallets that are not on localhost are ignored
createWalletDumpFile = true;

//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

// For todays date;
Date.prototype.today = function () { 
    return ((this.getDate() < 10)?"0":"") + this.getDate() +"_"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"_"+ this.getFullYear();
}

// For the time now
Date.prototype.timeNow = function () {
     return ((this.getHours() < 10)?"0":"") + this.getHours() +"-"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +"-"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

// A modern Altcoin Core REST and RPC client to execute administrative tasks, wallet operations and queries about network and the blockchain.
const Client = require('altcoin-rpc');
// A simple multi-level logger for console, file, and rolling file appenders.
const SimpleNodeLogger = require('simple-node-logger');

function unlockWallet(coinClient){
    return new Promise((resolve, reject)=>{
        coinClient.walletPassphrase(walletPassphrase, 300,function(error, result) {
            if(error){
                reject(error);
            }else{
                resolve(result);
            }   
        });
    });
}

function listAccounts(coinClient){
    return new Promise((resolve, reject)=>{
        coinClient.listAccounts(function(error, result) {
            if(error){
                reject(error);
            }else{
                resolve(result);
            }   
        });
    }); 
}

function getAddressesByAccount(coinClient,account){
    return new Promise((resolve, reject)=>{
        coinClient.getAddressesByAccount(account,function(error, result) {
            if(error){
                reject(error);
            }else{
                resolve(result);
            }   
        });
    }); 
}

function dumpPrivKey(coinClient,address){
    return new Promise((resolve, reject)=>{
        coinClient.dumpPrivKey(address,function(error, result) {
            if(error){
                reject(error);
            }else{
                resolve(result);
            }   
        });
    }); 
}

function dumpWallet(coinClient,coinSymbolName){
    return new Promise((resolve, reject)=>{
        coinClient.dumpWallet(process.cwd()+'/walletdumps/'+coinSymbolName+'_'+new Date().today()+"-"+new Date().timeNow()+'.dumpWallet',function(error, result) {
            if(error){
                reject(error);
            }else{
                resolve(result);
            }   
        });
    });
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

(async () => {
    await asyncForEach(configs, async (config) => {

        var walletServer = config[0];
        var walletUser = config[1];
        var walletPassword = config[2];
        var walletPort = config[3];
        global.walletPassphrase = config[4];
        var walletSSL = config[5];
        var walletSSLStrict = config[6];
        var walletCA = config[7];
        var coinSymbolName = config[8];

        // Wallet connection options
        var coinClientSSL = { host: walletServer, username: walletUser, password: walletPassword, port: walletPort };
        // If strict mode is enabled and certificate path defined
        if(walletCA){
            coinClientSSL.ssl = true;
            coinClientSSL.agentOptions = {};
            coinClientSSL.agentOptions.ca = walletCA;
        }else{ // If normal mode or ssl with strict mode disabled
            coinClientSSL.ssl = {};
            coinClientSSL.ssl.enabled = walletSSL;
            coinClientSSL.ssl.strict = walletSSLStrict;
        }

        const coinClient = new Client(coinClientSSL);

        const getKeys = async () => {
            // List accounts
            await listAccounts(coinClient).then(async accounts => {
                var log = SimpleNodeLogger.createSimpleFileLogger( process.cwd()+'/keys/'+coinSymbolName+'_keys_'+new Date().today()+"-"+new Date().timeNow()+'.log' );
                // Log coin symbol/name
                log.info('Wallet: '+coinSymbolName);
                var key;
                for (key in accounts) {
                    if (accounts.hasOwnProperty(key)) {
                        // Get addresses by account
                        await getAddressesByAccount(coinClient,key).then(async accountAddresses => {
                            // For each address
                            await asyncForEach(accountAddresses, async (address) => {
                                // Get privkey
                                await dumpPrivKey(coinClient,address).then(privKey => {
                                    // Log addresss and privkey
                                    log.info('Address: '+address+' - Key: '+privKey);
                                    return;
                                }).catch(error => {
                                    if(debug){
                                        console.error(error);
                                    }
                                    if(error.code == '-4'){
                                        log.info('Address: '+address+' - Key: Private key for address is not known');
                                        return;
                                    }
                                    if(error.code == '500'){
                                        console.error(coinSymbolName+': RPC work queue limit reached.');
                                        return;
                                    }
                                    console.error(coinSymbolName+': Failed to get address private key.');
                                    return;
                                });
                            });
                        }).catch(error => {
                            if(debug){
                                console.error(error);
                            }
                            console.error(coinSymbolName+': Failed to get addresses by account.');
                            return;
                        });
                    }
                }
            }).catch(error => {
                if(debug){
                    console.error(error);
                }
                console.error(coinSymbolName+': Failed to get account list.');
                return;
            });
        }

        // Create wallet dump file
        const createWalletDump = async () => {
            await dumpWallet(coinClient,coinSymbolName).then(async result => {
                getKeys();
            }).catch(error => {
                if(debug){
                    console.error(error);
                }   
                console.error(coinSymbolName+': Faled to dump wallet.');
                return;
            })
        }

        // Unlock wallet if walletPassword is not empty
        if(walletPassphrase){
            await unlockWallet(coinClient).then(async result => {
                if(createWalletDumpFile && walletServer == "localhost" || createWalletDumpFile && walletServer == "127.0.0.1"){
                    createWalletDump();
                }else{
                    getKeys();
                }
            }).catch(error => {
                if(debug){
                    console.error(error);
                }
                console.error(coinSymbolName+': An error occurred while unlocking the wallet. Please check the password.');
                return;
            })
        }else{
            if(createWalletDumpFile && walletServer == "localhost" || createWalletDumpFile && walletServer == "127.0.0.1"){
                createWalletDump();
            }else{
                getKeys();
            }
        }

    });
})();