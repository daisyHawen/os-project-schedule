function Process(ID, ProcessName, Type, ApplyResTime, Res, TimeToRun) { // 构造一个进程的PCB
    this.ID = ID; //    进程ID    进程标识
    this.ProcessName = ProcessName; // 进程名称 设为P1,P2,P3,P4
    this.State = "Ready"; // 进程状态 1-运行,2-就绪,3-等待,4-完成
    this.Type = Type; // 进程类型   0-系统进程,1-用户进程
    this.ApplyResTime = ApplyResTime; // 请求资源时刻 请求资源的时刻
    this.Res = Res; // 所需资源，一个4维数组
    this.totRes = new Array(4);
    this.nowRes = new Array(Res.length);

    for (var i in Res[0]) this.totRes[i] = this.nowRes[i] = 0;

    for (var i in Res)
        for (var j in Res[i])
            this.totRes[j] += Res[i][j];

    this.TimeToRun = TimeToRun; // 总共需要CPU的时间   假设进程还需要运行的时间数(剩余服务时间),可设定整数表示
    this.AlreadyRunTime = 0; // 运行时间    当前进程已经运行的时间
    this.WaitingTime = 0; //
    this.isBlocked = false; // 是否被阻塞
    this.getPriority = getPriority;
    this.resourceNeed = resourceNeed;
    this.nextResourceTime = nextResourceTime;
    this.nextResource = nextResource;

    function getPriority() { // 优先级 为进程赋予的优先权值
        return (this.WaitingTime + this.TimeToRun) / this.TimeToRun;
    }

    function nextResourceTime() { // 获取下次申请资源的时间
        var pos = -1;
        for (var i in this.ApplyResTime)
            if (this.ApplyResTime[i] >= this.AlreadyRunTime) {
                pos = i;
                break;
            }
        if (pos == -1) return null;
        return this.ApplyResTime[pos];
    }

    function nextResource() { // 获取当下次申请资源的数组
        var pos = -1;
        for (var i in this.ApplyResTime)
            if (this.ApplyResTime[i] >= this.AlreadyRunTime) {
                pos = i;
                break;
            }
        if (pos == -1) return null;
        return this.Res[pos];
    }

    function resourceNeed() { // 获取当前状态需要申请资源的数组，若不需要申请则返回null
        var pos = -1;
        for (var i in this.ApplyResTime)
            if (this.ApplyResTime[i] == this.AlreadyRunTime)
                pos = i;
        if (pos == -1) return null;
        return this.Res[pos];
    }
}

var RunningQueue = new Array();
var ReadyQueue = new Array();
var WaitingQueue = new Array();
var FinishedQueue = new Array();
var NowTime = 0;
var totPro = 0;
var Resource = new Array(0, 0, 0, 0);
var MaxResource = new Array(0, 0, 0, 0);
var ProcessMap = new Array();

function compare(a, b) { // 排序函数
    if (b.getPriority() != a.getPriority())
        return b.getPriority() - a.getPriority();
    return a.TimeToRun - b.TimeToRun;
}

function buildElement(type, attr, innerHTML) {
    var html = "";
    html = '<' + type;

    for (key in attr) {
        if (key == "html") continue;
        html += ' ' + key + ' = ' + '"' + attr[key] + '" ';
    }
    html += ' >' + (innerHTML == null ? '无' : innerHTML) + '</' + type + '>';
    return html;
}

function getProcessInfo(pro) {
    var attr = {};
    attr.id = pro.ID;
    attr.rel = "popover";
    switch (pro.State) {
        case "Running":
            attr.class = "button red";
            break;
        case "Ready":
            attr.class = "button blue";
            break;
        case "Waiting":
            attr.class = "button purple";
            break;
        case "Finished":
            attr.class = "button white";
            break;
    }
    attr["data-original-title"] = "进程名称：" + pro.ProcessName;

    var s = "";
    s += "进程ID：" + pro.ID + "<br>";
    s += "进程状态：" + pro.State + "<br>";
    s += "进程类型：" + pro.Type + "<br>";
    s += "共需资源：" + pro.totRes + "<br>";
    s += "已申请资源：" + pro.nowRes + "<br>";
    s += "下次申请时间：" + (pro.nextResourceTime()==null?null:pro.nextResourceTime()+1) + "<br>";
    s += "下次申请资源：" + pro.nextResource() + "<br>";
    s += "剩余时间：" + pro.TimeToRun + "<br>";
    s += "已运行时间：" + pro.AlreadyRunTime + "<br>";
    s += "总等待时间：" + pro.WaitingTime + "<br>";
    s += "是否I/O阻塞：" + (pro.isBlocked ? "是" : "否") + "<br>";

    attr["data-content"] = s;
    var html = pro.ProcessName;
    if (pro.State == "Ready")
        html += "(RR:" + pro.getPriority().toFixed(2) + ")";
    if (pro.State == "Running")
        html += "(T:" + pro.TimeToRun + ")" + "&nbsp;<button onclick='setBlocked(" + pro.ID + ")' class='btn btn-default'>阻塞</button>";
    if (pro.State == "Waiting" && pro.isBlocked)
        html += "&nbsp;<button onclick='clrBlocked(" + pro.ID + ")' class='btn btn-default'>解除阻塞</button>";

    s = buildElement("a", attr, html);
    return buildElement("li", {}, s);
}

function displayQueue(name, queue) { // 显示信息到
    console.log(name + ":\n");
    console.log(queue);
    var html = "";
    for (var i in queue)
        html += getProcessInfo(queue[i]);
    $("#" + name).html(html);

    for (var i in queue) {
        var id = queue[i].ID;
        $("#" + id).popover({
            placement: 'bottom',
            trigger: 'hover'
        });
    }
}

function displayResource() {
    var s = "<li><a>可用资源</a></li>";
    for (var i in Resource)
        s += "<li><a>" + Resource[i] + "</a></li>";
    s += '<li><a  style="padding:9px;" id="set-res" data-toggle="modal" data-target="#myRes"><span class="glyphicon glyphicon-cog" style="line-hight:100%;"></span></a></li>';
    $("#resource_info").html(s);
}

function refreshUI() { // 刷新UI界面
    ResortReadyQueue();
    displayQueue("ReadyQueue", ReadyQueue);
    displayQueue("RunningQueue", RunningQueue);
    displayQueue("WaitingQueue", WaitingQueue);
    displayQueue("FinishedQueue", FinishedQueue);
    displayResource();
    $("#nowtime").html("当前时刻：" + NowTime);
    $("#notice_pronum").html("当前已创建" + totPro + "个进程");
}

function addNewProcess(pro) {
    if (ProcessMap[pro.ID] != null) {
        alert("进程ID冲突！");
        return;
    }
    ProcessMap[pro.ID] = pro;
    pro.State = "Ready";
    ReadyQueue.push(pro);
    totPro++;
    refreshUI();
}

function setBlocked(ID) {
    ProcessMap[ID].isBlocked = true;
    refreshUI();
}

function clrBlocked(ID) {
    ProcessMap[ID].isBlocked = false;
    var pos = -1;
    for (var i in WaitingQueue)
        if (ID == WaitingQueue[i].ID)
            pos = i;
    var res = WaitingQueue.splice(pos, 1);
    res[0].State = "Ready";
    ReadyQueue = ReadyQueue.concat(res);
    refreshUI();
}

function ResortReadyQueue() { // 按优先级重排就绪队列
    ReadyQueue.sort(compare);
}

function applyResource(pro, res) { // 分配资源
    for (var i in res) {
        Resource[i] -= res[i];
        pro.nowRes[i] += res[i];
    }
}

function releaseResource(pro) { // 释放资源
    for (var i in pro.totRes) Resource[i] += pro.totRes[i];
}

function askResource(pro, res) { // 实现银行家算法，若成功返回true，若失败则返回false
    // 输入res为一个4维数组，表示4种资源分别所需多少。
    if (res == null) return true;
    var process = RunningQueue.concat(ReadyQueue, WaitingQueue); // 获取所有还未完成的进程
    var Res = new Array(0, 0, 0, 0); // 获取剩余资源的信息
    //var isFailed = false;
    for (var i in Resource) {
        Res[i] = Resource[i] - res[i];
        pro.nowRes[i] += res[i];
    }

    // Banker's algorithm :
    var finishJudge = false;
    var beAllocate;
    var ok = new Array(process.length);
    for (var i = 0; i < process.length; i++)
        ok[i] = false;

    while (!finishJudge) {
        finishJudge = true;
        for (var i in process)
            if (ok[i] == false) {
                beAllocate = true;
                for (var j = 0; j < Res.length; j++) //判断是否可分配资源给i进程
                {
                    if (process[i].totRes[j] - process[i].nowRes[j] > Res[j]) {
                        beAllocate = false;
                        break;
                    }
                }
                if (beAllocate) {
                    finishJudge = false;
                    for (var j = 0; j < Res.length; j++) {
                        Res[j] = Res[j] + process[i].nowRes[j]; //释放已被占用资源
                    }
                    ok[i] = true;
                }
            }
    }

    for (var i in res)
        pro.nowRes[i] -= res[i];

    for (var i = 0; i < process.length; i++)
        if (ok[i] == false) return false;
    return true;
}

function RunUnitTime(pro) {
    pro.AlreadyRunTime++;
    pro.TimeToRun--;
}

function scheduleWaitingQueue() {
    var pro;
    for (var i = 0; i < WaitingQueue.length; i++) {
        pro = WaitingQueue[i];
        if (pro.isBlocked == false && askResource(pro, pro.resourceNeed())) {
            WaitingQueue.splice(i, 1);
            pro.State = "Ready";
            ReadyQueue.push(pro);
            i--;
        }
    }
}

function refreshQueue(queue) {
    for (var i in queue)
        queue[i].WaitingTime++;
}

function Run() {
    var pro;

    if (RunningQueue.length != 0) {
        pro = RunningQueue[0];
        if (pro.isBlocked == true) {
            pro.State = "Waiting";
            RunningQueue.shift();
            WaitingQueue.push(pro);
        } else {
            if (askResource(pro, pro.resourceNeed()))
                applyResource(pro, pro.resourceNeed());
            else {
                pro.State = "Waiting";
                RunningQueue.shift();
                WaitingQueue.push(pro);
            }
        }
    }

    var isNew = false;
    if (RunningQueue.length == 0)
        isNew = true;

    while (RunningQueue.length == 0) {
        if (ReadyQueue.length == 0) {
            NowTime++;
            refreshQueue(WaitingQueue);
            return;
        }
        ResortReadyQueue();
        // display ReadyQueue
        pro = ReadyQueue.shift();
        RunningQueue.push(pro);
        if (askResource(pro, pro.resourceNeed())) {
            //applyResource(pro, pro.resourceNeed());
            pro.State = "Running";
            break;
        } else {
            pro.State = "Waiting";
            RunningQueue.shift();
            WaitingQueue.push(pro);
        }
    }

    if (isNew) return;

    RunUnitTime(pro);
    NowTime++;
    if (pro.TimeToRun == 0) {
        releaseResource(pro);
        RunningQueue.shift();
        pro.State = "Finished";
        FinishedQueue.push(pro);
        scheduleWaitingQueue();
    }

    refreshQueue(ReadyQueue);
    refreshQueue(WaitingQueue);
}

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}

function nextUnitTime() {
    Run();
    refreshUI();
}

function getRand(l, r) {
    return Math.floor(Math.random() * (r - l + 1)) + l;
}

function addRandomProcess() {
    var id = totPro + 1;
    var name = "P" + id;
    id += 100;
    var type = (Math.random() > 0.5 ? 1 : 0);
    var TimeToRun = getRand(1, 10);
    var size = getRand(1, Math.min(4, TimeToRun));
    var ApplyResTime = new Array();
    var Res = new Array();
    var pre = -1;
    var RestResource = new Array(MaxResource[0], MaxResource[1], MaxResource[2], MaxResource[3]);
    for (var i in RestResource) RestResource[i] = getRand(0,RestResource[i]);
    for (var i = 1; i <= size; i++) {
        pre += getRand(1, TimeToRun - pre - (size - i) - 1 );
        ApplyResTime.push(pre);
        var tmp = new Array();
        for (var j = 0; j < 4; j++) {
            var x = getRand(0, RestResource[j]);
            tmp.push(x);
            RestResource[j] -= x;
        }
        Res.push(tmp);
    }
    addNewProcess(new Process(id, name, type, ApplyResTime, Res, TimeToRun));
}

function getSelectedValue(id){
    var slct = document.getElementById(id);
    return slct.options[slct.selectedIndex].value;
}

function addProcessFromHTML(){
    var PID = $("#pID").val();
    var ProcessName = $("#ProcessName").val();
    var Type = getSelectedValue("Type");
    var TimeToRun = $("#TimeToRun").val();
    var ApplyResTime = eval($("#ApplyResTime").val());
    for (var i in ApplyResTime) ApplyResTime[i]--;
    var Res = eval($("#Res").val());
    addNewProcess(new Process(PID, ProcessName, Type, ApplyResTime, Res, TimeToRun));
}

function setResource(){
    if (NowTime!=0) { alert("请先重新运行整个程序"); return;}
    Resource = eval($("#Resource").val());
    MaxResource = eval($("#Resource").val());
    refreshUI();
}

function go() {
    Resource = [0, 0, 0, 0];
    MaxResource = [0, 0, 0, 0];
    refreshUI();
}
