let canvas = document.getElementById("myCanvas");
let context = canvas.getContext("2d");
canvas.addEventListener('click', onclick, false);
let bgColor = "beige";
let gridColumns = 9;
let gridRows = 9;
let gridSize = 40;
let ballRadius = 13;
let colors = ["red", "blue", "orange", "green", "brown"];
let nextColors = [];
let paths = [];
let eliminatedBalls = [];
let num = 0;
let num1 = 0;
let result = 0;
let currentColor = '';
let score = 0;
let stopJump = null;
let stopRemove = null;
let movePath = [];
let map = {
    init: function () {
        map.costEnergy_S = 10;
        map.costEnergy_L = 14;
        map.openArea = [];
        map.closeArea = {};
        map._createMapData();
    },
    /**  创建网格数据 */
    _createMapData: function () {
        let cache = map.cache;

        map.data = [];
        for (let y = 0, _arr; y < gridRows; y++) {
            _arr = [];
            for (let x = 0, mapNode; x < gridColumns; x++) {
                mapNode = new map.Node(gridSize * x + gridSize / 2, gridSize * y + gridSize / 2);
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
        let openArea = map.openArea;
        for (let i = 0, l = openArea.length; i < l; i++) {
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
        let energyW = Math.abs(map.endNode.x - aNode.x) * map.costEnergy_S;
        let energyH = Math.abs(map.endNode.y - aNode.y) * map.costEnergy_S;
        let _H = energyW + energyH;
        let _G = (Math.abs(aNode.x - cNode.x) === Math.abs(aNode.y - cNode.y) ? map.costEnergy_L : map.costEnergy_S);
        if (cNode.fObj) _G = cNode.fObj.G + _G;

        return { F: _H + _G, H: _H, G: _G };
    },
    /**  获取当前父节点周围的点  */
    getAroundNode: function (node) {
        let maxHeight = gridRows;
        let maxWidth = gridColumns;
        let nodeX;
        let nodeY;
        let corner = [];

        for (let x = -1 * gridSize; x <= gridSize; x += gridSize) {
            nodeX = node.x + x;
            for (let y = -1 * gridSize, mapNode, _fObj, tmpNode; y <= gridSize; y += gridSize) {
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
        let closeArea = map.closeArea;
        let x = obj.x;
        let y = obj.y;
        let getNode = map.getNode;

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
            let _fMinNode = map._getFMin();
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
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridColumns; x++) {
                let id = map.getId(gridSize * x + gridSize / 2, gridSize * y + gridSize / 2);
                let node = map.cache[id];
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
    context.font = "15px Arial";
    context.strokeText("Next colors : ", 0, 385);
    context.strokeText("Score : 0", 200, 385);
})();
function CheckIsGameOver() {
    let count = 0
    for (item in map.closeArea) {
        count++;
    }
    if (count === gridColumns * gridRows) {
        return true;
    }
    else
        return false;
}
function onclick(event) {
    let mousePos = getMousePos(event);
    let node = map.getNode(mousePos.x, mousePos.y);
    if (!node)
        return;
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
        if (!map.startNode)
            return;
        map.setEndNode(node);
        map.getPath();
        if (paths.length > 0) {
            cancelAnimationFrame(stopJump);
            paths.reverse();
            // movePath = SmoothPath(paths);
            currentColor = map.startNode.color;
            map.startNode.color = bgColor;
            map.startNode.isRoadBlock = false;
            //delete map.closeArea[map.startNode.id];
            RemoveBall(map.startNode.x, map.startNode.currentY);
            let moveAnimation = setInterval(function () {
                if (num > 0)
                    RemoveBall(paths[num - 1].x, paths[num - 1].y);
                let x = paths[num].x;
                let y = paths[num].y;
                CreateBall(currentColor, x, y);
                num++;
                if (num >= paths.length) {
                    clearInterval(moveAnimation);
                    let node = map.getNode(x, y);
                    node.color = currentColor;
                    node.isRoadBlock = true;

                    num = 0;
                    paths = [];
                    map.startNode = null;
                    checkResult();
                    map.resetArea();

                }
            }, 40);
        }
        else
            map.resetArea();
    }
}
function SmoothPath(frames) {
    let tempPath = [];
    tempPath.push({ x: map.startNode.x, y: map.startNode.y });

    for (let i = 0; i < paths.length; i++) {
        if (tempPath[i].x === paths[i].x) {
            for (let j = 1; j < frames; j++) {
                tempPath.push({ x: tempPath[i].x, y: tempPath[i].y + j * gridSize / frames });
            }
        }
        else {
            for (let j = 1; j < frames; j++) {
                tempPath.push({ x: tempPath[i].x + j * gridSize / frames, y: tempPath[i].y });
            }
        }
        tempPath.push({ x: paths[i].x, y: paths[i].y });
    }
    return tempPath;
}
function DrawRect() {
    let canvas = document.getElementById("bgCanvas");
    let context = canvas.getContext("2d");
    let endPoint = gridColumns * gridSize;
    for (let i = 0; i <= endPoint; i += gridSize) {
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
        let color = GetRandomColor();
        let x = GetRandomNum();
        let y = GetRandomNum();
        let node = map.getNode(x, y);
        let id = map.getId(x, y);
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
    for (let i = 0; i < 3; i++) {
        let color = nextColors[i];
        let x = GetRandomNum();
        let y = GetRandomNum();
        let node = map.getNode(x, y);
        let id = map.getId(x, y);
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

    CreateBall(nextColors[0], 100, 380);
    CreateBall(nextColors[1], 130, 380);
    CreateBall(nextColors[2], 160, 380);
}
function CreateBall(color, x, y) {
    //增加小球渐变颜色，实现粗糙光照3d效果。
    let grd = context.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
    grd.addColorStop(1, color);
    grd.addColorStop(0, "white");
    // context.fillStyle = "rgba(255,255,255,0.5)";
    context.fillStyle = grd;
    context.beginPath();
    context.arc(x, y, ballRadius, 0, 2 * Math.PI);
    context.fill();
}
function SelectBall() {
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
    context.clearRect(x - ballRadius, y - ballRadius, ballRadius * 2, ballRadius * 2)
}
function getMousePos(evt) {
    let rect = canvas.getBoundingClientRect();
    let x = evt.clientX - rect.left * (canvas.width / rect.width);
    let y = evt.clientY - rect.top * (canvas.height / rect.height);
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
    let node = map.endNode;
    let h = [];
    let v = [];
    let l = [];
    let r = [];
    for (let i = -1; i < 2; i++) {
        for (j = -1; j < 2; j++) {
            if (i == 0 && j == 0)
                continue;
            for (k = 1; k < 9; k++) {
                if (node.x + i * k * gridSize > 0 && node.x + i * k * gridSize < 380 && node.y + j * k * gridSize > 0 && node.y + j * k * gridSize < 380) {
                    let leftNode = map.cache[map.getId(node.x + i * k * gridSize, node.y + j * k * gridSize)];
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
        context.fillStyle = bgColor;
        context.fillRect(200, 373, 150, 20);
        context.strokeText("Score : " + score, 200, 385);

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
    map.endNode.color = '';
    map.endNode.isRoadBlock = false;
    for (i = 0; i < eliminatedBalls.length; i++) {
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