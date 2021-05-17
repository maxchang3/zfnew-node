const request = require('request').defaults({jar: true}); // jar true才行
const cheerio = require('cheerio');
const rsa = require('node-bignumber');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

module.exports = class School {
    /**
    * 初始化一个学校类。
    * @param {String} baseUrl 教务系统基本地址，不包括二级目录。例如 http://jwxt.example.com/jwglxt/ 只需要jwglxt前的部分，如下所示: http://jwxt.example.com/
    */
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.keyUrl = baseUrl + '/jwglxt/xtgl/login_getPublicKey.html';
        this.loginUrl = baseUrl + '/jwglxt/xtgl/login_slogin.html';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Referer': this.loginUrl,
            'Cookie': '',
        };
        //this.cookie = "";
        this.CACHE_PATH = path.resolve(__dirname, '../.cache');
    };

    /**
    * 在login函数后获取学校信息和登录信息，用于向GetInfo中传递获取信息。
    * @return {Object} 包含各种组合后的url以及登录后含cookie的headers。
    * @instance
    */
    info(){
        return {
            "baseUrl":this.baseUrl,
            "keyUrl":this.keyUrl,
            "loginUrl":this.loginUrl,
            "headers" : this.headers,
           // "cookie": this.cookie,
        }
    };
    /**
     * 登录账号
     * @param {String} sid 学号/教工号
     * @param {String} password  密码
     * @returns {Object} 返回promise对象，包含{"code":"……","result":"……"} code: 1为登录成功，0为登录失败。 result： 若code为0则为失败信息。若code为1则为headers。
     * @instance
     */
     async login(sid, password) {
        let cache = this._getCache(sid);
        //  存在缓存中直接应用。
        if (cache) { 
            console.log(cache);
            this.headers = JSON.parse(cache);
            return({ "code": "1", "result": this.headers });
        } 
        let enPassword = await this._request(this.keyUrl).then(login_req => {
            if (login_req == "error") return login_req;
            let res = JSON.parse(login_req);
            return this._getRSA(res['modulus'], res['exponent'], password);
        });
        
        let loginParam = await this._request(this.loginUrl).then(html => {
            const $ = cheerio.load(html);
            let csrftoken = $("#csrftoken").val();
            //console.log(csrftoken)
            return {
                "csrftoken": csrftoken,
                'yhm': sid,
                'mm': enPassword,
            }
        });
        let final_result = await this._request(this.loginUrl, "POST", loginParam).then((loginFinal) => {
            if (loginFinal) {
                this._createCache(sid,JSON.stringify(this.headers));
                return({ "code": "1", "result": this.headers });
            } else {
                return({ "code": "0", "result": "用户名或密码错误" });
            }
        })
        return final_result;
    }
    // 保存cookie的request请求，存疑：使用jar: true才能记住登录请求，是否内部的cookie处理实际上是没用的？
    _request (url, method = "GET", data = null) {
        return new Promise((resolve) => {
            request({
                method: method,
                url: url,
                headers: this.headers,
                form: data, //发送application/x-www-form-urlencoded才可，不能发json
                //jar: this.jar, 不用jar了没用。
            }, (error, response, body) => {
                if (!error) {
                    let cookie = response.headers['set-cookie'];
                    if (cookie) {
                        // this.cookie = cookie.toString();// 传递string类型 
                        this.headers['Cookie'] =  cookie.toString();// 没必要单独分出来一个cookie
                    }
                    if (response.statusCode == 200) {
                        if(method=="POST"){
                            const $ = cheerio.load(body);
                            let result = $("#tips").text();
                            if(result.indexOf('用户名或密码不正确')>=1){
                                resolve(false)
                            }
                        }//登录时处理密码错误的情况
                        resolve(body);
                    } else if (response.statusCode == 302) {
                        resolve(true);
                    }
                } else {
                    resolve("Error"+error);
                }
            });
        })
    };
    _getRSA(m, e, password) {
        let rsaKey = new rsa.Key();
        let modulus = rsa.b64tohex(m);
        let exponent = rsa.b64tohex(e);
        rsaKey.setPublic(modulus, exponent);
        let encrypted = rsa.hex2b64(rsaKey.encrypt(password));
        return encrypted;
    };
    _createCache(sid,context){
        let userId = crypto.createHash('md5').update(`${sid}_${this.baseUrl}`).digest('hex');
        fs.writeFile(`${this.CACHE_PATH}/${userId}`,context,(error)=>{
            if(error) return console.error(error);    
        })
    }
    _getCache(sid){
        let userId = crypto.createHash('md5').update(`${sid}_${this.baseUrl}`).digest('hex');
        let data;
        try {
            data = fs.readFileSync(`${this.CACHE_PATH}/${userId}`);
        } catch (error) {
            return false;
        }
        return data.toString();
    }
}