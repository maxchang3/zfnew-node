const cheerio = require('cheerio');
const rsa = require('node-bignumber');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const got = require('got');

module.exports = class School {
    /**
    * 初始化一个学校类。
    * @param {String} baseUrl 教务系统基本地址，不包括二级目录。例如 http://jwxt.example.com/jwglxt/ 只需要jwglxt前的部分，如下所示: http://jwxt.example.com/
    */
    constructor(baseUrl, useCache = false, timeout = 0) {
        this.baseUrl = baseUrl;
        this.keyUrl = baseUrl + '/jwglxt/xtgl/login_getPublicKey.html';
        this.loginUrl = baseUrl + '/jwglxt/xtgl/login_slogin.html';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Referer': this.loginUrl,
            'Cookie': '',
        };
        this.cookie_route = ''
        this.CACHE_PATH = path.resolve(__dirname, '../.cache');
        this.useCache = useCache;
        this.timeout = timeout;
        //this.cookie = "";
    };

    /**
    * 在login函数后获取学校信息和登录信息，用于向GetInfo中传递获取信息。
    * @return {Object} 包含各种组合后的url以及登录后含cookie的headers。
    * @instance
    */
    info() {
        return {
            baseUrl: this.baseUrl,
            keyUrl: this.keyUrl,
            loginUrl: this.loginUrl,
            headers: this.headers,
            timeout: this.timeout
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
        //  存在缓存中直接应用
        if (this.useCache) {
            let cache = this._getCache(sid);
            if (cache) {
                let headers = JSON.parse(cache);
                let cacheValid = await this._testCache(headers);
                if (cacheValid) {
                    this.headers = headers;
                    return ({ "code": "1", "result": this.headers });
                } else {
                    this._deleteCache(sid);
                }
            }
        }
        let enPassword = await this._request(this.keyUrl).then(login_req => {
            if (login_req == "error") return login_req;
            let res = JSON.parse(login_req);
            return this._getRSA(res['modulus'], res['exponent'], password);
        });
        let loginParam = await this._request(this.loginUrl).then(html => {
            const $ = cheerio.load(html);
            let csrftoken = $("#csrftoken").val();
            return {
                "csrftoken": csrftoken,
                'yhm': sid,
                'mm': enPassword,
            }
        });
        let final_result = await this._request(this.loginUrl, "POST", loginParam).then((loginFinal) => {
            if (loginFinal) {
                let cookies = this.headers['Cookie'];
                let cookiesItem = cookies.split(";")[3].split(",")[2].split("=")[1];
                this.headers['Cookie'] = "JSESSIONID=" + cookiesItem + ";" + this.cookie_route
                this._createCache(sid, JSON.stringify(this.headers));
                return ({ "code": 1, "token": cookiesItem });
            } else {
                return ({ "code": -1, "message": "用户名或密码错误" });
            }
        })
        return final_result;
    }
    _request(url, method = "GET", data = {}, headers = this.headers) {
        return new Promise(async (resolve,reject) => {
            try {
                let timeout = this.timeout!=""?({request: this.timeout}):{};
                const response = await got({
                    url: url,
                    headers: headers,
                    method: method,
                    form: data,
                    allowGetBody: true,
                    followRedirect:false,
                    retry: 0,
                    timeout 
                });
                let body = response.body;
                let cookie = response.headers['set-cookie'];
                if (cookie != undefined) {
                    // this.cookie = cookie.toString();// 传递string类型 
                    this.headers['Cookie'] = cookie.toString();
                    if (cookie[1] != undefined) {
                        if (cookie[1].indexOf('route') != -1) {
                            this.cookie_route = cookie[1]
                        }
                    }
                }
                if (response.statusCode == 200) {
                    if (method == "POST") {
                        const $ = cheerio.load(body);
                        let result = $("#tips").text();
                        console.log(result)
                        if (result.includes('用户名或密码不正确')) {
                            resolve(false)
                        }
                    }
                    resolve(body);
                } else if (response.statusCode == 302) {
                    if(response.headers.location == "http://jwxt.example.edu.cn/jwglxt/xtgl/login_slogin.html"){
                        resolve(false);
                    }
                    resolve(true);
                } else if (response.statusCode == 901) {
                    resolve(901)
                }
            } catch (error) {
                reject(error);
            }


        })
    };
    /**
     * 获取用户特征标识符，通过用户名与基础链接构造
     * @param {string} sid 
     * @returns {string} userId
     */
    _userId(sid){
        return  crypto.createHash('md5').update(`${sid}_${this.baseUrl}`).digest('hex');
    };
    _getRSA(m, e, password) {
        let rsaKey = new rsa.Key();
        let modulus = rsa.b64tohex(m);
        let exponent = rsa.b64tohex(e);
        rsaKey.setPublic(modulus, exponent);
        let encrypted = rsa.hex2b64(rsaKey.encrypt(password));
        return encrypted;
    };
    _createCache(sid, context) {
        if (!(this.useCache)) return;
        let userId = this._userId(sid);
        if (!(fs.existsSync(this.CACHE_PATH))) fs.mkdir(this.CACHE_PATH, (err) => {
            if (err) throw err;
        });
        fs.writeFile(`${this.CACHE_PATH}/${userId}`, context, (error) => {
            if (error) return console.error(error);
        })
    }
    _getCache(sid) {
        if (!(this.useCache)) return;
        let userId = this._userId(sid);
        let data;
        try {
            data = fs.readFileSync(`${this.CACHE_PATH}/${userId}`);
        } catch (error) {
            return false;
        }
        return data.toString();
    }
    _deleteCache(sid) {
        let userId = this._userId(sid);
        try {
            fs.unlinkSync(`${this.CACHE_PATH}/${userId}`);
        } catch (error) {
            return false;
        }
        return true;
    }
    _testCache = async (hd) => {
        if (!(this.useCache)) return;
        let test_res = await this._request(this.baseUrl + "/jwglxt/", "GET", {}, hd);
        if(!(test_res)) return Promise.resolve(false)
        if(test_res.indexOf("/jwglxt/xtgl/dl_loginForward.html")!=-1){
            return Promise.resolve(true)
        }
        return Promise.resolve(false)

    }
}