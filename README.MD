# 新版正方教务系统API Node.js版
# Zfnew-Node based on [zfnew](https://github.com/NeroAsmarr/zfnew)

##  简介
Node.js下获取新正方教务系统的相关信息，便于二次开发使用，支持自动登录、获取课表、成绩、个人信息。

> 本项目部分代码和内容逻辑借鉴自 [zfnew](https://github.com/NeroAsmarr/zfnew) 

> 本项目对部分学校可能存在兼容性问题，受制于作者只上了一个大学，有任何兼容性问题欢迎提出……

> 小程序云函数部署下可能需要babel进行转换。

[zfnew](https://github.com/NeroAsmarr/zfnew) 是基于Python的新版正方教务API，我使用过非常好用，也适合于校园APP、小程序、网页的构建。出于某些业务需要Node.js部署，故开发了此项目。

已实现的功能：

- [x] 自动登陆、cookies获取

- [x] 缓存机制、复用cookie

- [x] 个人信息

- [x] 成绩

- [x] 课程表

- [x] 对教务系统接口比较凄惨的变量名称做了重新映射

## 兼容性
你是否已经对你的学校进行了测试呢？欢迎补充测试生效的学校
- [x] xx大学
- [x] xx学院  

## 安装
[![NPM](https://nodei.co/npm/zfnew-node.png)](https://nodei.co/npm/zfnew-node/)
```
npm install zfnew-node
```

## 快速上手
```
npm install zfnew-node
```

```javascript
const {School,GetInfo}  = require("zfnew-node")

let example = new School("http://jwxt.example.edu.cn");
example.login('你的学号', '你的密码').then(async(info)=>{
    if(info['code']==1){
        GetInfo.init(example.info());  
        // 注意，本模块所有的操作都是返回的promise对象，请使用then或await接收参数后进行处理。
        let grade = await GetInfo.getGrade("2020","1");
        let schedule = await GetInfo.getSchedule("2020","1");
        console.log(grade,schedule);

    }else{
        console.log(info['result']);
    }
});
```

## 接口

### School类

#### new School(baseUrl);
|Name	|Type|	Description|
|  ----  | ----  |----|
|baseUrl|String|教务系统基本地址，不包括二级目录。例如 http://jwxt.example.com/jwglxt/ 只需要jwglxt前的部分，如下所示: http://jwxt.example.com/|
|useCache（可选）|boolean|是否使用缓存，开启该选项后会保存cookie到本地目录，在下次登录后通过校验后直接使用该缓存，以增强性能，但有账号信息泄露的风险，现阶段缓存文件对用户的信息进行了md5加密，但是仍有cookie泄露风险，请注意使用场景合理开启|
|timeout（可选）|boolean|设置超时时间，单位为**毫秒**，请合理设置（dev）|
---

#### School.login(sid,password);
|Name	|Type|	Description|
|  ----  | ----  |----|
|sid |String|学号/教工号|
|password | String|密码|


返回promise对象，包含{"code":"……","result":"……"} 

code: 1为登录成功，0为登录失败。 
result： 若code为0则为失败信息。若code为1则为headers。

---


#### School&#46;info();
返回包含各种组合后的url以及登录后含cookie的headers,用于登录成功后传递参数。


---


### GetInfo 工具
#### GetInfo.init(data);
初始化GetInfo，请传递School&#46;info();的返回值。

---


#### GetInfo.getDetailInfo();
获取已登录学生的详细信息。

进行此操作请先进行School.login与GetInfo.init()。
返回promise对象，包含由教务系统获取的详细信息。
  
>【注意】 此信息包含身份证号、考生号、户籍所在地、邮箱等敏感信息，有较大的安全隐患。除特殊情况和内部使用下，对于仅需要做验证部分信息（如姓名专业年级）情况下不建议使用此方法。

> 如果只是获得基本信息请使用getInfo()或getInfoFromSch();

> 经过简单考察不同学校有较大区别，建议按需获取，故未做参数整理。

* [ ] Todo：整理部分常用参数

---

#### GetInfo.getInfo();
获取已登录学生的基本信息。
进行此操作请先进行School.login与GetInfo.init()。
返回promise对象，包含获取的信息。

---


#### GetInfo.getSchedule(year, term);
|Name	|Type|	Description|
|  ----  | ----  |----|
|year |String|学年，如2021。（注，如今年为2021年，是2020-2021学年，则取2020）|
|term | String|学期数，如1，2，3，full为整个学年|

返回promise对象，包含获取的课程表信息。

---

#### GetInfo.getGrade(year, term);
|Name	|Type|	Description|
|  ----  | ----  |----|
|year |String|学年，如2021。（注，如今年为2021年，是2020-2021学年，则取2020）|
|term | String|学期数，如1，2，3，full为整个学年|

返回promise对象，包含获取的成绩信息。

---


#### GetInfo.getInfoFromSch();
从课程表接口获得学生信息，不含二级教学单位。
返回promise对象，包含获取的信息。 {"class":"……","studentId":"……","name":"……"}; 
