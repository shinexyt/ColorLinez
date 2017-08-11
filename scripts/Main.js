var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
var tipsCanvas = document.getElementById("tipsCanvas");
var tipsContext = tipsCanvas.getContext("2d");
canvas.addEventListener('click', click, false);
var bgColor = "beige";
var gridColumns = 9;
var gridRows = 9;
var gridSize = 40;
var ballRadius = 13;
var colors = ["red", "blue", "orange", "green", "brown"];
var nextColors = [];
var paths = [];
var eliminatedBalls = [];
var num = 0;
var num1 = 0;
var result = 0;
var currentColor = '';
var score = 0;
var stopJump = null;
var stopRemove = null;
var stopMoveAnimation = null;
var movePath = [];
// type custormNode = { isRoadBlock: boolean, color: string,id:number };
var map = {
    init: function () {
        // map.costEnergy_S = 10;
        // map.costEnergy_L = 14;
        map.openArea = [];
        map.closeArea = {};
        map._createMapData();
    },
    /**  创建网格数据 */
    _createMapData: function () {
        var cache = map.cache;
        map.data = [];
        for (var y = 0, _arr = void 0; y < gridRows; y++) {
            _arr = [];
            for (var x = 0, mapNode = void 0; x < gridColumns; x++) {
                mapNode = new map.Node(gridSize * x + gridSize / 2, gridSize * y + gridSize / 2);
                map.cache[mapNode.id] = mapNode;
                _arr.push(mapNode);
            }
            map.data.push(_arr);
        }
    },
    Node: function (x, y) {
        this.x = x;
        this.y = y;
        this.id = map.getId(x, y);
        this.isRoadBlock = false;
        this.prev = null;
        this.fObj = null;
        this.color = '';
    },
    getNode: function (x, y) {
        return map.cache[map.getId(x, y)];
    },
    getId: function (x, y) {
        return 'map_' + x + '_' + y;
    },
    setStartNode: function (node) {
        map.startNode = node;
    },
    setEndNode: function (node) {
        map.endNode = node;
    },
    /**  检测当前开启列表中是否含有传进来的Node 存在则从开启列表中选中将其返回*/
    _isOpenAreaExitNode: function (node) {
        var openArea = map.openArea;
        for (var i = 0, l = openArea.length; i < l; i++) {
            if (openArea[i].id === node.id)
                return openArea[i];
        }
        return null;
    },
    getPath: function () {
        map.getAroundNode(map.startNode);
        if (map.openArea.length == 0)
            return;
        map.search(map.endNode);
        map.doPaths(map.endNode);
    },
    /**  获取当前点的F G H值 */
    getF: function (cNode, aNode) {
        var energyW = Math.abs(map.endNode.x - aNode.x) * map.costEnergy_S;
        var energyH = Math.abs(map.endNode.y - aNode.y) * map.costEnergy_S;
        var _H = energyW + energyH;
        var _G = (Math.abs(aNode.x - cNode.x) === Math.abs(aNode.y - cNode.y) ? map.costEnergy_L : map.costEnergy_S);
        if (cNode.fObj)
            _G = cNode.fObj.G + _G;
        return {
            F: _H + _G,
            H: _H,
            G: _G
        };
    },
    /**  获取当前父节点周围的点  */
    getAroundNode: function (node) {
        var maxHeight = gridRows;
        var maxWidth = gridColumns;
        var nodeX;
        var nodeY;
        var corner = [];
        for (var x = -1 * gridSize; x <= gridSize; x += gridSize) {
            nodeX = node.x + x;
            for (var y = -1 * gridSize, mapNode = void 0, _fObj = void 0, tmpNode = void 0; y <= gridSize; y += gridSize) {
                nodeY = node.y + y;
                //剔除本身以及对角线的点
                if ((x === 0 && y === 0) || x * y != 0)
                    continue;
                if (nodeX > 0 && nodeY > 0 && nodeX <= maxWidth * gridSize && nodeY <= maxHeight * gridSize) {
                    mapNode = map.getNode(nodeX, nodeY);
                    //查找周围的新节点， 如果新节点处于拐角则跳过
                    if (Math.abs(x) == Math.abs(y) && map._isCorner(mapNode, {
                        x: x,
                        y: y
                    }))
                        continue;
                    if (!map.closeArea[mapNode.id]) {
                        _fObj = map.getF(node, mapNode);
                        // 如果周围节点已在开启区域的 根据当前节点 获取新的G值  与当前点的进行比较 如果小于以前的G值 则指定当前节点为其父节点
                        tmpNode = map._isOpenAreaExitNode(mapNode);
                        if (tmpNode) {
                            if (tmpNode.fObj.G <= _fObj.G)
                                continue;
                        }
                        mapNode.fObj = _fObj;
                        mapNode.prev = node;
                        map.openArea.push(mapNode);
                    }
                }
            }
        }
    },
    /**  监测节点是否为拐角， 如果是 从开启列表中移除穿越拐角到达的点 */
    _isCorner: function (node, obj) {
        var closeArea = map.closeArea;
        var x = obj.x;
        var y = obj.y;
        var getNode = map.getNode;
        if (Math.abs(x) === Math.abs(y)) {
            if (x > 0 && y < 0) {
                return closeArea[getNode(node.x, node.y + 1).id] || closeArea[getNode(node.x - 1, node.y).id];
            }
            if (x < 0 && y > 0) {
                return closeArea[getNode(node.x, node.y - 1).id] || closeArea[getNode(node.x + 1, node.y).id];
            }
            if (x === y && x > 0) {
                return closeArea[getNode(node.x, node.y - 1).id] || closeArea[getNode(node.x - 1, node.y).id];
            }
            if (x === y && x < 0) {
                return closeArea[getNode(node.x, node.y + 1).id] || closeArea[getNode(node.x + 1, node.y).id];
            }
        }
    },
    /**  不断删除查找周围节点，直到找寻到结束点 */
    search: function (node) {
        while (!map.closeArea[node.id]) {
            var _fMinNode = map._getFMin();
            if (!_fMinNode)
                break;
            map.getAroundNode(_fMinNode);
            map.search(node);
        }
    },
    doPaths: function (node) {
        if (map.closeArea[node.id]) {
            map._drawRoad(node);
        }
    },
    /**  绘制路线 */
    _drawRoad: function (node) {
        paths.push(node);
        //delete map.closeArea[node.id];
        if (node.prev !== map.startNode)
            map._drawRoad(node.prev);
    },
    /**  从开启列表从寻找F点最小的点 从开启列表移除 移入关闭列表 */
    _getFMin: function () {
        if (map.openArea.length == 0)
            return null;
        map._orderOpenArea();
        map.closeArea[map.openArea[0].id] = map.openArea[0];
        return map.openArea.shift();
    },
    /**  排序开启列表 */
    _orderOpenArea: function () {
        this.openArea.sort(function (objF, objN) {
            return objF.fObj.F - objN.fObj.F;
        });
    },
    resetArea: function () {
        map.openArea = [];
        map.closeArea = {};
        for (var y = 0; y < gridRows; y++) {
            for (var x = 0; x < gridColumns; x++) {
                var id = map.getId(gridSize * x + gridSize / 2, gridSize * y + gridSize / 2);
                var node = map.cache[id];
                if (node.isRoadBlock === true)
                    map.closeArea[id] = node;
            }
        }
    },
    data: [],
    openArea: [],
    closeArea: {},
    cache: {},
    startNode: null,
    endNode: null,
    costEnergy_S: 10,
    costEnergy_L: 14
    //container: null
};
(function () {
    document.bgColor = bgColor;
    map.init();
    DrawRect();
    CreateInitialBall();
    GetNextColors();
})();
function CheckIsGameOver() {
    var count = 0;
    for (var item in map.closeArea) {
        count++;
    }
    if (count === gridColumns * gridRows) {
        return true;
    }
    else
        return false;
}
function playSound(uri) {
    var audio = new Audio(uri);
    audio.play();
}
function click(event) {
    var mousePos = getMousePos(event);
    var node = map.getNode(mousePos.x, mousePos.y);
    if (!node) {
        return;
    }
    if (node.isRoadBlock) {
        cancelAnimationFrame(stopJump);
        if (map.startNode) {
            RemoveBall(map.startNode.x, map.startNode.currentY);
            CreateBall(map.startNode.color, map.startNode.x, map.startNode.y);
        }
        map.setStartNode(node);
        SelectBall();
    }
    else {
        if (!map.startNode) {
            playSound('media/click-error.mp3');
            return;
        }
        map.setEndNode(node);
        map.getPath();
        if (paths.length > 0) {
            cancelAnimationFrame(stopJump);
            RemoveBall(map.startNode.x, map.startNode.currentY);
            paths = SmoothPath(5);
            currentColor = map.startNode.color;
            map.startNode.color = bgColor;
            map.startNode.isRoadBlock = false;
            num = 1;
            playSound('media/run.mp3');
            moveAnimation();
        }
        else {
            playSound('media/click-error1.mp3');
            map.resetArea();
        }
    }
}
function moveAnimation() {
    RemoveBall(paths[num - 1].x, paths[num - 1].y);
    var x = paths[num].x;
    var y = paths[num].y;
    CreateBall(currentColor, x, y);
    num++;
    if (num >= paths.length) {
        cancelAnimationFrame(stopMoveAnimation);
        var node = map.getNode(x, y);
        node.color = currentColor;
        node.isRoadBlock = true;
        num = 0;
        paths = [];
        map.startNode = null;
        checkResult();
        map.resetArea();
    }
    else {
        stopMoveAnimation = requestAnimationFrame(moveAnimation);
    }
}
/**将路径步数进行分解 */
function SmoothPath(frames) {
    paths.reverse();
    var tempPath = [];
    var step = gridSize / frames;
    paths.unshift({
        x: map.startNode.x,
        y: map.startNode.y
    });
    for (var i = 1; i < paths.length; i++) {
        tempPath.push({
            x: paths[i - 1].x,
            y: paths[i - 1].y
        });
        if (paths[i - 1].x === paths[i].x) {
            var flag = 1;
            if (paths[i - 1].y > paths[i].y)
                flag = -1;
            for (var j = 1; j < frames; j++) {
                tempPath.push({
                    x: paths[i - 1].x,
                    y: paths[i - 1].y + flag * j * step
                });
            }
        }
        else {
            var flag = 1;
            if (paths[i - 1].x > paths[i].x)
                flag = -1;
            for (var j = 1; j < frames; j++) {
                tempPath.push({
                    x: paths[i - 1].x + flag * j * step,
                    y: paths[i - 1].y
                });
            }
        }
    }
    tempPath.push({
        x: paths[paths.length - 1].x,
        y: paths[paths.length - 1].y
    });
    return tempPath;
}
function DrawRect() {
    var bgCanvas = document.getElementById("bgCanvas");
    var bgContext = bgCanvas.getContext("2d");
    var endPoint = gridColumns * gridSize;
    bgContext.lineWidth = 0.5;
    for (var i = 0; i <= endPoint; i += gridSize) {
        bgContext.beginPath();
        bgContext.moveTo(0, i);
        bgContext.lineTo(endPoint, i);
        bgContext.stroke();
        bgContext.closePath();
        bgContext.beginPath();
        bgContext.moveTo(i, 0);
        bgContext.lineTo(i, endPoint);
        bgContext.stroke();
        bgContext.closePath();
    }
}
function CreateInitialBall() {
    for (var i = 0; i < 5; i++) {
        var color = GetRandomColor();
        var x = GetRandomNum();
        var y = GetRandomNum();
        var node = map.getNode(x, y);
        var id = map.getId(x, y);
        if (!node.isRoadBlock) {
            node.isRoadBlock = true;
            node.color = color;
            map.closeArea[id] = node;
            CreateBall(color, x, y);
        }
        else
            i--;
    }
}
function CreateNextBall() {
    for (var i = 0; i < 3; i++) {
        var color = nextColors[i];
        var x = GetRandomNum();
        var y = GetRandomNum();
        var node = map.getNode(x, y);
        var id = map.getId(x, y);
        if (!node.isRoadBlock) {
            node.isRoadBlock = true;
            node.color = color;
            map.closeArea[id] = node;
            if (!CheckIsGameOver()) {
                CreateBall(color, x, y);
                map.setEndNode(node);
                autoCheckResult();
            }
            else {
                alert('Game Over!');
                window.location.reload();
                break;
            }
        }
        else
            i--;
    }
}
function GetRandomNum() {
    return gridSize * Math.floor(Math.random() * 9) + gridSize / 2;
}
function GetRandomColor() {
    return colors[Math.floor(Math.random() * 5)];
}
function GetNextColors() {
    nextColors = [];
    nextColors.push(colors[Math.floor(Math.random() * 5)]);
    nextColors.push(colors[Math.floor(Math.random() * 5)]);
    nextColors.push(colors[Math.floor(Math.random() * 5)]);
    CreateTipsBall(nextColors[0], 15, 15);
    CreateTipsBall(nextColors[1], 45, 15);
    CreateTipsBall(nextColors[2], 75, 15);
}
function CreateTipsBall(color, x, y) {
    //增加小球渐变颜色，实现粗糙光照3d效果。
    var grd = tipsContext.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
    grd.addColorStop(1, color);
    grd.addColorStop(0, "white");
    // context.fillStyle = "rgba(255,255,255,0.5)";
    tipsContext.fillStyle = grd;
    tipsContext.beginPath();
    tipsContext.arc(x, y, ballRadius, 0, 2 * Math.PI);
    tipsContext.fill();
}
function CreateBall(color, x, y) {
    //增加小球渐变颜色，实现粗糙光照3d效果。
    var grd = context.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
    grd.addColorStop(1, color);
    grd.addColorStop(0, "white");
    // context.fillStyle = "rgba(255,255,255,0.5)";
    context.fillStyle = grd;
    context.beginPath();
    context.arc(x, y, ballRadius, 0, 2 * Math.PI);
    context.fill();
}
function SelectBall() {
    playSound('media/click.mp3');
    map.startNode.currentY = map.startNode.y;
    //小球每一帧跳动幅度
    map.startNode.flag = 1;
    JumpBall();
}
function JumpBall() {
    RemoveBall(map.startNode.x, map.startNode.currentY);
    //小球跳动范围
    if (Math.abs(map.startNode.currentY - map.startNode.y) == 8)
        map.startNode.flag *= -1;
    map.startNode.currentY += map.startNode.flag;
    CreateBall(map.startNode.color, map.startNode.x, map.startNode.currentY);
    stopJump = requestAnimationFrame(JumpBall);
}
function RemoveBall(x, y) {
    context.clearRect(x - ballRadius, y - ballRadius, ballRadius * 2, ballRadius * 2);
}
function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    var x = evt.clientX - rect.left * (canvas.width / rect.width);
    var y = evt.clientY - rect.top * (canvas.height / rect.height);
    return {
        x: Math.ceil(x / gridSize) * gridSize - gridSize / 2,
        y: Math.ceil(y / gridSize) * gridSize - gridSize / 2
    };
}
function getScore(startScore) {
    num++;
    result = startScore + 4 * num - 2;
    if (num < eliminatedBalls.length + 1 - 5)
        getScore(result);
    else
        num = 0;
}
function getEliminatedBalls() {
    var node = map.endNode;
    var h = [];
    var v = [];
    var l = [];
    var r = [];
    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            if (i == 0 && j == 0)
                continue;
            for (var k = 1; k < 9; k++) {
                if (node.x + i * k * gridSize > 0 && node.x + i * k * gridSize < 380 && node.y + j * k * gridSize > 0 && node.y + j * k * gridSize < 380) {
                    var leftNode = map.cache[map.getId(node.x + i * k * gridSize, node.y + j * k * gridSize)];
                    if (leftNode.color == node.color) {
                        if (Math.abs(i + j) == 2)
                            r.push(leftNode);
                        else if (Math.abs(i + j) == 0)
                            l.push(leftNode);
                        else if (i == 0)
                            v.push(leftNode);
                        else
                            h.push(leftNode);
                        //eliminatedBalls.push(leftNode);
                    }
                    else
                        break;
                }
                else
                    break;
            }
        }
    }
    if (h.length >= 4)
        eliminatedBalls = eliminatedBalls.concat(h);
    if (v.length >= 4)
        eliminatedBalls = eliminatedBalls.concat(v);
    if (l.length >= 4)
        eliminatedBalls = eliminatedBalls.concat(l);
    if (r.length >= 4)
        eliminatedBalls = eliminatedBalls.concat(r);
}
function checkResult() {
    getEliminatedBalls();
    if (eliminatedBalls.length >= 4) {
        if (eliminatedBalls.length + 1 == 5)
            score += 10;
        else {
            getScore(10);
            score += result;
            result = 0;
        }
        document.getElementById('scoreboard').innerText = score.toString();
        ClearPathBalls();
    }
    else {
        eliminatedBalls = [];
        CreateNextBall();
        GetNextColors();
    }
}
function autoCheckResult() {
    getEliminatedBalls();
    if (eliminatedBalls.length >= 4) {
        ClearPathBalls();
    }
    else {
        eliminatedBalls = [];
    }
}
/**消除连线的小球*/
function ClearPathBalls() {
    playSound('media/bingo.mp3');
    map.endNode.color = '';
    map.endNode.isRoadBlock = false;
    for (var i = 0; i < eliminatedBalls.length; i++) {
        eliminatedBalls[i].isRoadBlock = false;
        eliminatedBalls[i].color = '';
    }
    RemoveBall(map.endNode.x, map.endNode.y);
    RemoveBalls();
}
function RemoveBalls() {
    RemoveBall(eliminatedBalls[num1].x, eliminatedBalls[num1].y);
    num1++;
    if (num1 < eliminatedBalls.length)
        stopRemove = requestAnimationFrame(RemoveBalls);
    else {
        num1 = 0;
        eliminatedBalls = [];
        cancelAnimationFrame(stopRemove);
    }
}
