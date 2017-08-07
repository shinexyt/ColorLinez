﻿var map = {
    gridWidth: 30,
    girdHeight: 20,
    roadBlock: 0.1,
    init: function ()
    {
        map.costEnergy_S = 10;
        map.costEnergy_L = 14;
        map.openArea = [];
        map.closeArea = {};

        map._createMapData();
    },
    /**  创建网格数据 */
    _createMapData: function ()
    {
        var cache = map.cache;

        map.data = [];
        for (var y = 0, _arr; y < map.girdHeight; y++)
        {
            _arr = [];
            for (var x = 0, mapNode; x < map.gridWidth; x++)
            {
                mapNode = new map.Node(x, y);
                if (Math.random() < map.roadBlock)
                {
                    mapNode.isRoadBlock = true;
                    map.closeArea[mapNode.id] = mapNode;
                };
                map.cache[mapNode.id] = mapNode;
                _arr.push(mapNode);
            };
            map.data.push(_arr);
        };
    },
    /**  建立地图网格 */
    getUI: function ()
    {
        var table = [];
        var data = map.data;

        table.push('<table cellpadding="0" cellspacing="1" bgcolor="0" class="map">');
        table.push('<tbody>');
        for (var y = 0, yl = data.length; y < yl; y++)
        {
            table.push('<tr>');
            for (var x = 0, xl = data[y].length; x < xl; x++)
            {
                table.push('<td id="' + data[y][x].id + '" class="' + (data[y][x].isRoadBlock === true ? 'map_close' : 'map_open') + '"></td>')
            }
            table.push('</tr>');
        };
        table.push('</tbody>');
        table.push('</table>');

        map.container = document.createElement('div');
        map.container.innerHTML = table.join('');

        return map.container;
    },
    Node: function (x, y)
    {
        this.x = x;
        this.y = y;
        this.id = 'map_' + x + '_' + y;
        this.isRoadBlock = false;
        this.prev = null;
        this.fObj = null;
    },
    getNode: function (x, y)
    {
        return map.cache['map_' + x + '_' + y];
    },
    setStartNode: function (node)
    {
        map.startNode = node;
    },
    setEndNode: function (node)
    {
        map.endNode = node;
    },
    /**  检测当前开启列表中是否含有传进来的Node 存在则从开启列表中选中将其返回*/
    _isOpenAreaExitNode: function (node)
    {
        var openArea = map.openArea;
        for (var i = 0, l = openArea.length; i < l; i++)
        {
            if (openArea[i].id === node.id) return openArea[i];
        };

        return null;
    },
    getPath: function ()
    {
        map.getAroundNode(map.startNode);
        if (map.openArea.length == 0) return;
        map.search(map.endNode);
        map.draw(map.endNode);
    },
    /**  获取当前点的F G H值 */
    getF: function (cNode, aNode)
    {
        var energyW = Math.abs(map.endNode.x - aNode.x) * map.costEnergy_S;
        var energyH = Math.abs(map.endNode.y - aNode.y) * map.costEnergy_S;
        var _H = energyW + energyH;
        var _G = (Math.abs(aNode.x - cNode.x) === Math.abs(aNode.y - cNode.y) ? map.costEnergy_L : map.costEnergy_S);
        if (cNode.fObj) _G = cNode.fObj.G + _G;

        return { F: _H + _G, H: _H, G: _G };
    },
    /**  获取当前父节点周围的点  */
    getAroundNode: function (node)
    {
        var maxHeight = map.girdHeight;
        var maxWidth = map.gridWidth;
        var nodeX;
        var nodeY;
        var corner = [];

        for (var x = -1; x <= 1; x++)
        {
            nodeX = node.x + x;
            for (var y = -1, mapNode, _fObj, tmpNode; y <= 1; y++)
            {
                nodeY = node.y + y;
                //剔除本身
                if (x === 0 && y === 0) continue;
                if (nodeX >= 0 && nodeY >= 0 && nodeX < maxWidth && nodeY < maxHeight)
                {
                    mapNode = map.getNode(nodeX, nodeY);

                    //查找周围的新节点， 如果新节点处于拐角则跳过
                    if (Math.abs(x) == Math.abs(y) && map._isCorner(mapNode, { x: x, y: y })) continue;

                    if (!map.closeArea[mapNode.id])
                    {
                        _fObj = map.getF(node, mapNode);
                        // 如果周围节点已在开启区域的 根据当前节点 获取新的G值  与当前点的进行比较 如果小于以前的G值 则指定当前节点为其父节点
                        tmpNode = map._isOpenAreaExitNode(mapNode);
                        if (tmpNode)
                        {
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
    _isCorner: function (node, obj)
    {
        var closeArea = map.closeArea;
        var x = obj.x;
        var y = obj.y;
        var getNode = map.getNode;

        if (Math.abs(x) === Math.abs(y))
        {
            if (x > 0 && y < 0)
            {
                return closeArea[new getNode(node.x, node.y + 1).id] || closeArea[new getNode(node.x - 1, node.y).id];
            };

            if (x < 0 && y > 0)
            {
                return closeArea[new getNode(node.x, node.y - 1).id] || closeArea[new getNode(node.x + 1, node.y).id];
            };

            if (x === y && x > 0)
            {
                return closeArea[new getNode(node.x, node.y - 1).id] || closeArea[new getNode(node.x - 1, node.y).id];
            };

            if (x === y && x < 0)
            {
                return closeArea[new getNode(node.x, node.y + 1).id] || closeArea[new getNode(node.x + 1, node.y).id];
            };
        };
    },
    /**  不断删除查找周围节点，直到找寻到结束点 */
    search: function (node)
    {
        while (!map.closeArea[node.id])
        {
            var _fMinNode = map._getFMin();
            if (!_fMinNode) break;
            map.getAroundNode(_fMinNode);
            map.search(node);
        };

        
    },
    draw: function (node)
    {
        if (map.closeArea[node.id])
        {
            map._drawRoad(node);
        };
    },
    /**  绘制路线 */
    _drawRoad: function (node)
    {
        document.getElementById(node.id).style.background = '#EFA626';
        if (node.prev !== map.startNode) map._drawRoad(node.prev);
    },
    /**  从开启列表从寻找F点最小的点 从开启列表移除 移入关闭列表 */
    _getFMin: function ()
    {
        if (map.openArea.length == 0) return null;
        map._orderOpenArea();
        map.closeArea[map.openArea[0].id] = map.openArea[0];
        //document.getElementById(map.openArea[0].id).innerHTML = map.openArea[0].fObj.F + '^' + map.openArea[0].fObj.G + '^' + map.openArea[0].fObj.H;
        return map.openArea.shift();
    },
    /**  排序开启列表 */
    _orderOpenArea: function ()
    {
        this.openArea.sort(function (objF, objN)
        {
            return objF.fObj.F - objN.fObj.F;
        });
    },
    data: [],
    openArea: [],
    closeArea: {},
    cache: {},
    startNode: null,
    endNode: null,
    container: null
};

(function ()
{
    map.roadBlock = 0.3;
    map.init();

    var mapUI = map.getUI();
    var startNode = null;
    var isRun = false;

    // 计时器
    var Timer = function ()
    {
        this.startTime = +new Date;
    };

    Timer.prototype.stop = function ()
    {
        return +new Date - this.startTime;
    };

    document.getElementsByTagName('body')[0].appendChild(mapUI);

    mapUI.onclick = function (event)
    {
        event = event || window.event;

        var target = event.target || event.srcElement;

        if (isRun) return;
        if (target.nodeName !== "TD") return;

        var node = map.cache[target.id];
        if (node.isRoadBlock) return;
        if (!node) return;
        if (startNode)
        {
            map.setEndNode(node);

            var time = new Timer;
            map.getPath();
            document.title = '[' + time.stop() + '毫秒] ' + document.title;
            isRun = true;
            target.style.backgroundColor = 'red';
        } else
        {
            startNode = node;
            map.setStartNode(node);
            target.style.backgroundColor = 'green';
        };
    };
})();