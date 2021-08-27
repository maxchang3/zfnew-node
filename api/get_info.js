const cheerio = require('cheerio');
const got = require('got');
let baseUrl, keyUrl, loginUrl, headers,timeout;
let inited = false;

module.exports = {
    /**
     * 初始化GetInfo的内部信息
     * @param {Object} data  请从School.login登录成功后进行此操作。
     */
    init: (data) => {
        inited = true;
        baseUrl = data.baseUrl;
        keyUrl = data.keyUrl;
        loginUrl = data.loginUrl;
        headers = data.headers;
        timeout = data.timeout
    },

    /**
     * 获取已登录学生的详细信息。
     * 
     * 进行此操作请先进行School.login与GetInfo.init()。
     * @return {Object} 返回promise对象，包含由教务系统获取的详细信息。
     * 
     * 【注意】 此信息包含身份证号、考生号、户籍所在地、邮箱等敏感信息，有较大的安全隐患。
     * 除特殊情况和内部使用下，对于仅需要做验证部分信息（如姓名专业年级）情况下不建议使用此方法。
     * 如果只是获得基本信息请使用getInfo();
     * 经过简单考察不同学校有较大区别，建议按需获取，故不做整理。
     * Todo：整理部分常用参数。
     */
    getDetailInfo: () => {
        let urlDetailInfo = "/jwglxt/xsxxxggl/xsxxwh_cxCkDgxsxx.html?gnmkdm=N100801";
        return new Promise((resolve) => {
            _srequest(urlDetailInfo).then(json => {
                resolve(JSON.parse(json));
            })
        })
    },

    /**
     * 获取已登录学生的基本信息。
     * 
     * 进行此操作请先进行School.login与GetInfo.init()。
     * @return {Object} 返回promise对象，包含获取的信息。
     * 
     */
    getInfo: () => {
        // 利用教务系统首页的用户信息模块获取用户的基本信息
        // 避免xsxxwh_cxCkDgxsxx.html（真sb的命名）内信息过于详细导致的安全问题。
        let urlInfo = "/jwglxt/xtgl/index_cxYhxxIndex.html?xt=jw&localeKey=zh_CN&gnmkdm=index";
        return new Promise((resolve) => {
            _srequest(urlInfo).then(html => {
                const $ = cheerio.load(html);
                let name = $(".media-heading").text();
                //此处解析怀疑不同学校不同 可能需要根据自身情况处理。
                let stuclass = $(".media-body >p").text().split(" ");
                let info = {
                    "name": name,
                    "unit": stuclass[0],
                    "class": stuclass[1],
                };
                resolve(info);
            })
        })
    },
    /**
     * 获取课程表信息。
     * @param {String} year 学年，如2021。
     * @param {String} term 学期数，如1，2，3，full为整个学年。
     * @return {Object} 返回promise对象，包含获取的课程表信息。
     */
    getSchedule: (year, term, _newMap = null, _url = "jwglxt/kbcx/xskbcx_cxXsKb.html?gnmkdm=N2151") => {
        let termMap = { "1": "3", "2": "12", "3": "16", "full": '' }; // 第一学期是3，第二学期是12，第三学期是16，整个学年为空''。
        term = termMap[term]; //不明白，不懂，不理解。
        // data and newMap: copy and modify from zfnew in python. sb中文拼音缩写变量。
        let urlSchedule = _url;
        let data = {
            'xnm': year,
            'xqm': term,
            '_search': 'false',
            'nd': new Date().valueOf(),
            'queryModel.showCount': '15',  // 每页最多条数
            'queryModel.currentPage': '1',
            'queryModel.sortName': '',
            'queryModel.sortOrder': 'asc',
            'time': '1'  // 查询次数
        };
        let newMap = (_newMap) ? (_newMap) : [{
            'kcmc': 'courseTitle',
            'xm': 'teacher',
            'kch_id': 'courseId',
            'jc': 'courseSection',
            'zcd': 'courseWeek',
            'xqmc': 'campus',
            'cdmc': 'courseRoom',
            'jxbmc': 'className',
            'kcxszc': 'hoursComposition',
            'zhxs': 'weeklyHours',
            'zxs': 'totalHours',
            'xf': 'credit',
        }, 'kbList'];
        return new Promise((resolve) => {
            _srequest(urlSchedule, "POST", data).then(json => {
                //console.log(json)
                let flag = newMap[1] == 'kbList' || newMap[1] == 'items';
                let oldList = JSON.parse(json)[newMap[1]];
                let newList = _mappingDicList(flag ? oldList : [oldList], newMap[0]);
                //非课表部分场景下不是[{},{},{}]的形式，暂时以此形式分别，若此接口还有其他场景下调用应重构。
                resolve(flag ? newList : newList[0]);
            })
        })
    },
    /**
     * 从课程表接口获得学生信息，不含二级教学单位。
     * @returns {Object} 返回promise对象，包含获取的信息。 {"class":"……","studentId":"……","name":"……"}; 
     */
    getInfoFromSch: () => {
        return module.exports.getSchedule((new Date().getFullYear() - 1).toString(), "1", [
            {
                "XM": "name",
                "BJMC": "class",
                "XH": "studentId",
            },
            "xsxx"
        ]
        )
    },
    /**
     * 获取成绩信息。
     * @param {String} year 学年，如2021。
     * @param {String} term 学期数，如1，2，3，full为整个学年。
     * @return {Object} 返回promise对象，包含获取的成绩信息。
     */
    getGrade: (year, term,) => {
        let urlGrade = "/jwglxt/cjcx/cjcx_cxDgXscj.html?doType=query&gnmkdm=N305005";
        //newMap: copy and modify from zfnew in python
        let newMap = {
            'kcmc': 'courseTitle',
            'jsxm': 'teacher',
            'kch_id': 'courseId',
            'jxbmc': 'className',
            'kcxzmc': 'courseNature',
            'xf': 'credit',
            'cj': 'grade',
            'jd': 'gradePoint',
            'ksxz': 'gradeNature',
            'kkbmmc': 'startCollege',
            'kcbj': 'courseMark',
            'kclbmc': 'courseCategory',
            'kcgsmc': 'courseAttribution',
        };
        return module.exports.getSchedule(year, term, [newMap, "items"], urlGrade);

    },
}

// 获取对应API接口所用的request请求。
const _srequest = (afterUrl, method = "GET", data = {}) => {
    if (!inited) throw new Error("未初始化，请先使用init函数初始化。");
    return new Promise(async(resolve, reject) => {
        try {
            const response = await got({
                url: baseUrl + afterUrl,
                headers: headers,
                method: method,
                form: data,
                timeout: {request: this.timeout},
                allowGetBody: true,
                followRedirect:false,
                retry: 0,
            });
            if(response.statusCode == 200){
                resolve(response.body);
            } else {
                reject(response.statusCode);
            }
        } catch (error) {
           reject(error);
        }
    })
}
/**
 * 遍历一个含多个字典的集合，根据newMap映射其对应键值。
 * @param {Object} oldDicList 旧的字典集合,如: [{a:1……},{b:2……}]
 * @param {Object} newMap 映射字典,如: {a:'A',b:'B'}
 * @returns {Object}  新的字典集合,如: [{A:1……},{B:2……}]
 */
const _mappingDicList = (oldDicList, newMap) => {
    let newList = [];
    for (const course of oldDicList) {
        let temp = Object.fromEntries(
            Object.entries(course).map(([key, value]) =>
                newMap.hasOwnProperty(key) ? [newMap[key], value] : []
            )
        );
        delete temp.undefined;
        newList.push(temp);
    }
    return newList;
}
