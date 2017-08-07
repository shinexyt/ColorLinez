﻿var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
canvas.addEventListener('click', onclick, false);
var bgColor = "beige";
var gridColumns = 9;
var gridRows = 9;
var gridSize = 40;
var ballRadius = 10;
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
var map = {
    init: function () {
        map.costEnergy_S = 10;
        map.costEnergy_L = 14;
        map.openArea = [];
        map.closeArea = {};
        map._createMapData();
    },
    /**  创建网格数据 */
    _createMapData: function () {
        var cache = map.cache;

        map.data = [];
        for (var y = 0, _arr; y < gridRows; y++) {
            _arr = [];
            for (var x = 0, mapNode; x < gridColumns; x++) {
                mapNode = new map.Node(gridSize * x + gridSize / 2, gridSize * y + gridSize / 2);
                //if (Math.random() < map.roadBlock)
                //{
                //    mapNode.isRoadBlock = true;
                //    map.closeArea[mapNode.id] = mapNode;
                //};
                map.cache[mapNode.id] = mapNode;
                _arr.push(mapNode);
            };
            map.data.push(_arr);
        };
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
            if (openArea[i].id === node.id) return openArea[i];
        };

        return null;
    },
    getPath: function () {
        map.getAroundNode(map.startNode);
        if (map.openArea.length == 0) return;
        map.search(map.endNode);
        map.doPaths(map.endNode);
    },
    /**  获取当前点的F G H值 */
    getF: function (cNode, aNode) {
        var energyW = Math.abs(map.endNode.x - aNode.x) * map.costEnergy_S;
        var energyH = Math.abs(map.endNode.y - aNode.y) * map.costEnergy_S;
        var _H = energyW + energyH;
        var _G = (Math.abs(aNode.x - cNode.x) === Math.abs(aNode.y - cNode.y) ? map.costEnergy_L : map.costEnergy_S);
        if (cNode.fObj) _G = cNode.fObj.G + _G;

        return { F: _H + _G, H: _H, G: _G };
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
            for (var y = -1 * gridSize, mapNode, _fObj, tmpNode; y <= gridSize; y += gridSize) {
                nodeY = node.y + y;
                //剔除本身以及对角线的点
                if ((x === 0 && y === 0) || x * y != 0) continue;
                if (nodeX > 0 && nodeY > 0 && nodeX <= maxWidth * gridSize && nodeY <= maxHeight * gridSize) {
                    mapNode = map.getNode(nodeX, nodeY);

                    //查找周围的新节点， 如果新节点处于拐角则跳过
                    if (Math.abs(x) == Math.abs(y) && map._isCorner(mapNode, { x: x, y: y })) continue;

                    if (!map.closeArea[mapNode.id]) {
                        _fObj = map.getF(node, mapNode);
                        // 如果周围节点已在开启区域的 根据当前节点 获取新的G值  与当前点的进行比较 如果小于以前的G值 则指定当前节点为其父节点
                        tmpNode = map._isOpenAreaExitNode(mapNode);
                        if (tmpNode) {
                            if (tmpNode.fObj.G <= _fObj.G) continue;
                        };
                        mapNode.fObj = _fObj;
                        mapNode.prev = node;
                        map.openArea.push(mapNode);
                    };
                };
            };
        };
    },
    /**  监测节点是否为拐角， 如果是 从开启列表中移除穿越拐角到达的点 */
    _isCorner: function (node, obj) {
        var closeArea = map.closeArea;
        var x = obj.x;
        var y = obj.y;
        var getNode = map.getNode;

        if (Math.abs(x) === Math.abs(y)) {
            if (x > 0 && y < 0) {
                return closeArea[new getNode(node.x, node.y + 1).id] || closeArea[new getNode(node.x - 1, node.y).id];
            };

            if (x < 0 && y > 0) {
                return closeArea[new getNode(node.x, node.y - 1).id] || closeArea[new getNode(node.x + 1, node.y).id];
            };

            if (x === y && x > 0) {
                return closeArea[new getNode(node.x, node.y - 1).id] || closeArea[new getNode(node.x - 1, node.y).id];
            };

            if (x === y && x < 0) {
                return closeArea[new getNode(node.x, node.y + 1).id] || closeArea[new getNode(node.x + 1, node.y).id];
            };
        };
    },
    /**  不断删除查找周围节点，直到找寻到结束点 */
    search: function (node) {
        while (!map.closeArea[node.id]) {
            var _fMinNode = map._getFMin();
            if (!_fMinNode) break;
            map.getAroundNode(_fMinNode);
            map.search(node);
        };
    },
    doPaths: function (node) {
        if (map.closeArea[node.id]) {
            map._drawRoad(node);
        };
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
        if (map.openArea.length == 0) return null;
        map._orderOpenArea();
        map.closeArea[map.openArea[0].id] = map.openArea[0];
        //document.getElementById(map.openArea[0].id).innerHTML = map.openArea[0].fObj.F + '^' + map.openArea[0].fObj.G + '^' + map.openArea[0].fObj.H;
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
            };
        };
    },
    data: [],
    openArea: [],
    closeArea: {},
    cache: {},
    startNode: null,
    endNode: null
    //container: null
};
(function () {
    document.bgColor = bgColor;
    map.init();
    DrawRect();
    CreateInitialBall();
    GetNextColors();
    context.font = "15px Times New Roman";
    context.strokeText("Next colors : ", 0, 385);
    context.strokeText("Score : 0", 200, 385);
})();
function onclick(event) {
    cancelAnimationFrame(stopJump);
    //var isRun = false;
    var mousePos = getMousePos(event);
    var node = map.getNode(mousePos.x, mousePos.y);
    if (!node)
        return;
    if (node.isRoadBlock) {

        if (map.startNode) {
            cancelAnimationFrame(stopJump);
            RemoveBall(bgColor, map.startNode.x, map.startNode.currentY);
            CreateBall(map.startNode.color, map.startNode.x, map.startNode.y);
        }
        map.setStartNode(node);
        SelectBall();
        // CreateBall("black", node.x, node.y);
    }
    else {
        map.setEndNode(node);
        map.getPath();
        if (paths.length > 0) {
            paths.reverse();
            currentColor = map.startNode.color;
            map.startNode.color = bgColor;
            map.startNode.isRoadBlock = false;
            //delete map.closeArea[map.startNode.id];
            RemoveBall(bgColor, map.startNode.x, map.startNode.currentY);
            move();
        }
        else
            map.resetArea();

        //isRun = true;
    }
}
function move() {
    if (num > 0)
        RemoveBall(bgColor, paths[num - 1].x, paths[num - 1].y);
    var x = paths[num].x;
    var y = paths[num].y;
    CreateBall(currentColor, x, y);
    num++;
    if (num < paths.length)
        requestAnimationFrame(move);
    else {
        var node = map.getNode(x, y);
        node.color = currentColor;
        node.isRoadBlock = true;

        num = 0;
        paths = [];
        map.startNode = null;
        checkResult(true);
        map.resetArea();
        GetNextColors();
    }
}
function DrawRect() {
    var endPoint = gridColumns * gridSize;
    for (var i = 0; i <= endPoint; i += gridSize) {
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(endPoint, i);
        context.closePath();
        context.stroke();
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, endPoint);
        context.closePath();
        context.stroke();
    }
}
function CreateInitialBall() {
    for (i = 0; i < 5; i++) {
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
    for (i = 0; i < 3; i++) {
        var color = nextColors[i];
        var x = GetRandomNum();
        var y = GetRandomNum();
        var node = map.getNode(x, y);
        var id = map.getId(x, y);
        if (!node.isRoadBlock) {
            node.isRoadBlock = true;
            node.color = color;
            map.closeArea[id] = node;
            CreateBall(color, x, y);
            //num++;
            //map.endNode = node;
            //checkResult(false);
        }
        else
            i--;
    }
    //if (num < 3)
    //    requestAnimationFrame(CreateNextBall);
    //else
    //{
    //    nextColors = [];
    //    num = 0;
    //    map.resetArea();
    //}
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

    CreateBall(nextColors[0], 100, 380);
    CreateBall(nextColors[1], 130, 380);
    CreateBall(nextColors[2], 160, 380);
}
function CreateBall(color, x, y) {
    var grd = context.createRadialGradient(x - 1, y - 2, 1, x, y, 10);
    grd.addColorStop(1, color);
    grd.addColorStop(0, bgColor);
    context.fillStyle = grd;
    context.beginPath();
    context.arc(x, y, ballRadius, 0, 2 * Math.PI);
    context.fill();
}
function SelectBall() {
    map.startNode.currentY = map.startNode.y;
    map.startNode.flag = 2;
    JumpBall();
}
function JumpBall() {
    RemoveBall(bgColor, map.startNode.x, map.startNode.currentY);
    if (Math.abs(map.startNode.currentY - map.startNode.y) == 8)
        map.startNode.flag *= -1;
    map.startNode.currentY += map.startNode.flag;
    CreateBall(map.startNode.color, map.startNode.x, map.startNode.currentY);
    stopJump = requestAnimationFrame(JumpBall);
}
function RemoveBall(color, x, y) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, ballRadius + 1, 0, 2 * Math.PI);
    context.fill();
}
function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    var x = evt.clientX - rect.left * (canvas.width / rect.width);
    var y = evt.clientY - rect.top * (canvas.height / rect.height);
    return {
        x: Math.ceil(x / gridSize) * gridSize - gridSize / 2,
        y: Math.ceil(y / gridSize) * gridSize - gridSize / 2
    }
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
    for (i = -1; i < 2; i++) {
        for (j = -1; j < 2; j++) {
            if (i == 0 && j == 0)
                continue;
            for (k = 1; k < 9; k++) {
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
function checkResult(isGetScore) {
    getEliminatedBalls();
    if (eliminatedBalls.length >= 4) {
        if (isGetScore) {
            if (eliminatedBalls.length + 1 == 5)
                score += 10;
            else {
                getScore(10);
                score += result;
                result = 0;
            }
            context.fillStyle = bgColor;
            context.fillRect(200, 373, 150, 20);
            context.strokeText("Score : " + score, 200, 385);
        }
        map.endNode.color = '';
        map.endNode.isRoadBlock = false;
        for (i = 0; i < eliminatedBalls.length; i++) {
            eliminatedBalls[i].isRoadBlock = false;
            eliminatedBalls[i].color = '';
        }
        RemoveBall(bgColor, map.endNode.x, map.endNode.y);
        RemoveBalls();
    }
    else {
        eliminatedBalls = [];
        CreateNextBall();
    }
}
function RemoveBalls() {
    context.fillStyle = bgColor;
    context.beginPath();
    context.arc(eliminatedBalls[num1].x, eliminatedBalls[num1].y, ballRadius + 1, 0, 2 * Math.PI);
    context.fill();
    num1++;
    if (num1 < eliminatedBalls.length)
        requestAnimationFrame(RemoveBalls);
    else {
        num1 = 0;
        eliminatedBalls = [];
    }
}