# 新版正方教务系统API Node.js版
# Zfnew-Node based on [zfnew](https://github.com/NeroAsmarr/zfnew)

##  简介

> 本项目部分代码和内容逻辑借鉴自 [zfnew](https://github.com/NeroAsmarr/zfnew) 

> 本项目对部分学校可能存在兼容性问题，受制于作者只上了一个大学，有任何兼容性问题欢迎提出……

>~~登录那里的promise嵌套写的很丑，感觉还存在性能问题，应该要优化，所以现阶段稳定性运行还未测试，慎重使用或直接投入生产环境。~~ √已经在[ETFTS](https://github.com/etfts)老师帮助下改善。

[zfnew](https://github.com/NeroAsmarr/zfnew) 是基于Python的新版正方教务API，我使用过非常好用，也适合于校园APP、小程序、网页的构建。但是处于某些业务需要Node.js部署，故开发了此项目。

已实现的功能：

[x] 自动登陆、cookies获取

[x] 个人信息

[x] 成绩

[x] 课程表


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
const zfnew = require("zfnew-node")
const School = zfnew.School;
const GetInfo = zfnew.GetInfo;

let XXU = new School("http://jwxt.xxx.edu.cn");
XXU.login('你的学号', '你的密码').then(async(info)=>{
    if(info['code']==1){
        GetInfo.init(XXU.info());  
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


#### School.login(sid,password);
|Name	|Type|	Description|
|  ----  | ----  |----|
|sid |String|学号/教工号|
|password | String|密码|


返回promise对象，包含{"code":"……","result":"……"} 

code: 1为登录成功，0为登录失败。 
result： 若code为0则为失败信息。若code为1则为headers。

#### School&#46;info();
返回包含各种组合后的url以及登录后含cookie的headers,用于登录成功后传递参数。


### GetInfo 工具
#### GetInfo.init(data);
初始化GetInfo，请传递School&#46;info();的返回值。

#### GetInfo.getDetailInfo();
获取已登录学生的详细信息。

进行此操作请先进行School.login与GetInfo.init()。
返回promise对象，包含由教务系统获取的详细信息。
  
【注意】 此信息包含身份证号、考生号、户籍所在地、邮箱等敏感信息，有较大的安全隐患。除特殊情况和内部使用下，对于仅需要做验证部分信息（如姓名专业年级）情况下不建议使用此方法。

如果只是获得基本信息请使用getInfo()或getInfoFromSch();

经过简单考察不同学校有较大区别，建议按需获取，故不做参数整理。
Todo：整理部分常用参数 []。

#### GetInfo.getInfo();
获取已登录学生的基本信息。
进行此操作请先进行School.login与GetInfo.init()。
返回promise对象，包含获取的信息。

#### GetInfo.getSchedule(year, term);
|Name	|Type|	Description|
|  ----  | ----  |----|
|year |String|学年，如2021。（注，如今年为2021年，是2020-2021学年，则取2020）|
|term | String|学期数，如1，2，3，full为整个学年|

返回promise对象，包含获取的课程表信息。

#### GetInfo.getGrade(year, term);
|Name	|Type|	Description|
|  ----  | ----  |----|
|year |String|学年，如2021。（注，如今年为2021年，是2020-2021学年，则取2020）|
|term | String|学期数，如1，2，3，full为整个学年|

返回promise对象，包含获取的成绩信息。

#### GetInfo.getInfoFromSch();
从课程表接口获得学生信息，不含二级教学单位。
返回promise对象，包含获取的信息。 {"class":"……","studentId":"……","name":"……"}; 
