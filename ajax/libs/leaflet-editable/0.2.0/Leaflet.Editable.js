L.Editable = L.Class.extend({

    statics: {
        FORWARD: 1,
        BACKWARD: -1
    },

    options: {
        zIndex: 10000,
        polygonClass: L.Polygon,
        polylineClass: L.Polyline,
        markerClass: L.Marker,
        drawingCSSClass: 'leaflet-editable-drawing'
    },

    initialize: function (map, options) {
        L.setOptions(this, options);
        this.map = map;
        this.editLayer = this.createEditLayer();
        this.newClickHandler = this.createNewClickHandler();
        this.forwardLineGuide = this.createLineGuide();
        this.backwardLineGuide = this.createLineGuide();

    },

    createLineGuide: function () {
        return L.polyline([], {dashArray: '5,10', weight: 1});
    },

    createVertexIcon: function (options) {
        return L.Browser.touch ? new L.Editable.TouchVertexIcon(options) : new L.Editable.VertexIcon(options);
    },

    createNewClickHandler: function () {
        return L.marker(this.map.getCenter(), {
            icon: this.createVertexIcon({className: 'leaflet-div-icon leaflet-drawing-icon'}),
            opacity: 0
        });
    },

    createEditLayer: function () {
        return this.options.editLayer || new L.LayerGroup().addTo(this.map);
    },

    moveForwardLineGuide: function (latlng) {
        if (this.forwardLineGuide._latlngs.length) {
            this.forwardLineGuide._latlngs[1] = latlng;
            this.forwardLineGuide.redraw();
        }
    },

    moveBackwardLineGuide: function (latlng) {
        if (this.backwardLineGuide._latlngs.length) {
            this.backwardLineGuide._latlngs[1] = latlng;
            this.backwardLineGuide.redraw();
        }
    },

    anchorForwardLineGuide: function (latlng) {
        this.forwardLineGuide._latlngs[0] = latlng;
        this.forwardLineGuide.redraw();
    },

    anchorBackwardLineGuide: function (latlng) {
        this.backwardLineGuide._latlngs[0] = latlng;
        this.backwardLineGuide.redraw();
    },

    attachForwardLineGuide: function () {
        this.editLayer.addLayer(this.forwardLineGuide);
    },

    attachBackwardLineGuide: function () {
        this.editLayer.addLayer(this.backwardLineGuide);
    },

    detachForwardLineGuide: function () {
        this.forwardLineGuide._latlngs = [];
        this.editLayer.removeLayer(this.forwardLineGuide);
    },

    detachBackwardLineGuide: function () {
        this.backwardLineGuide._latlngs = [];
        this.editLayer.removeLayer(this.backwardLineGuide);
    },

    registerForDrawing: function (editor) {
        this.map.on('mousemove touchmove', editor.onMouseMove, editor);
        if (this._drawingEditor) this.unregisterForDrawing(this._drawingEditor);
        this._drawingEditor = editor;
        this.editLayer.addLayer(this.newClickHandler);
        this.newClickHandler.on('click', editor.onNewClickHandlerClicked, editor);
        if (L.Browser.touch) this.map.on('click', editor.onTouch, editor);
        L.DomUtil.addClass(this.map._container, this.options.drawingCSSClass);
    },

    unregisterForDrawing: function (editor) {
        editor = editor || this._drawingEditor;
        this.editLayer.removeLayer(this.newClickHandler);
        if (!editor) return;
        this.map.off('mousemove touchmove', editor.onMouseMove, editor);
        this.newClickHandler.off('click', editor.onNewClickHandlerClicked, editor);
        if (L.Browser.touch) this.map.off('click', editor.onTouch, editor);
        if (editor !== this._drawingEditor) return;
        delete this._drawingEditor;
        if (editor.drawing) editor.cancelDrawing();
        L.DomUtil.removeClass(this.map._container, this.options.drawingCSSClass);
    },

    stopDrawing: function () {
        this.unregisterForDrawing();
    },

    startPolyline: function () {
        var line = this.createPolyline([]).connectCreatedToMap(this.map),
            editor = line.enableEdit();
        editor.startDrawingForward();
        return line;
    },

    startPolygon: function () {
        var polygon = this.createPolygon([]).connectCreatedToMap(this.map),
            editor = polygon.enableEdit();
        editor.startDrawingForward();
        return polygon;
    },

    startHole: function (editor, latlng) {
        editor.newHole(latlng);
    },

    extendMultiPolygon: function (multi) {
        var polygon = this.createPolygon([]);
        multi.addLayer(polygon);
        polygon.multi = multi;
        var editor = polygon.enableEdit();
        editor.startDrawingForward();
        return polygon;
    },

    startMarker: function (latlng) {
        latlng = latlng || this.map.getCenter();
        var marker = this.createMarker(latlng).connectCreatedToMap(this.map),
            editor = marker.enableEdit();
        editor.startDrawing();
        return marker;
    },

    createPolyline: function (latlngs) {
        var line = new this.options.polylineClass(latlngs);
        this.map.fire('editable:created', {layer: line});
        return line;
    },

    createPolygon: function (latlngs) {
        var polygon = new this.options.polygonClass(latlngs);
        this.map.fire('editable:created', {layer: polygon});
        return polygon;
    },

    createMarker: function (latlng) {
        var marker = new this.options.markerClass(latlng);
        this.map.fire('editable:created', {layer: marker});
        return marker;
    }

});

L.Map.addInitHook(function () {

    this.whenReady(function () {
        if (this.options.editable) {
            this.editTools = new L.Editable(this, this.options.editOptions);
        }
    });

});

L.Editable.VertexIcon = L.DivIcon.extend({

    options: {
        iconSize: new L.Point(8, 8)
    }

});

L.Editable.TouchVertexIcon = L.Editable.VertexIcon.extend({

    options: {
        iconSize: new L.Point(20, 20)
    }

});


L.Editable.VertexMarker = L.Marker.extend({

    options: {
        draggable: true,
        riseOnOver: true,
        zIndex: 10001,
        className: 'leaflet-div-icon leaflet-vertex-icon'
    },

    initialize: function (latlng, latlngs, editor, options) {
        this.latlng = latlng;
        this.latlngs = latlngs;
        this.editor = editor;
        L.Marker.prototype.initialize.call(this, latlng, options);
        this.options.icon = this.editor.tools.createVertexIcon({className: this.options.className});
        this.latlng.__vertex = this;
        this.editor.editLayer.addLayer(this);
    },

    onAdd: function (map) {
        L.Marker.prototype.onAdd.call(this, map);
        L.DomEvent.on(this.dragging._draggable, 'drag', this.onDrag, this);
        this.on('click', this.onClick);
        this.on('contextmenu', this.onContextMenu);
        this.on('mousedown touchstart', this.onMouseDown);
        this.addMiddleMarkers();
    },

    onDrag: function (e) {
        var iconPos = L.DomUtil.getPosition(this._icon),
            latlng = this._map.layerPointToLatLng(iconPos);
        this.latlng.lat = latlng.lat;
        this.latlng.lng = latlng.lng;
        this.editor.refresh();
        if (this.middleMarker) {
            this.middleMarker.updateLatLng();
        }
        var next = this.getNext();
        if (next && next.middleMarker) {
            next.middleMarker.updateLatLng();
        }
    },

    onClick: function (e) {
        e.vertex = this;
        this.editor.onVertexMarkerClick(e);
    },

    onContextMenu: function (e) {
        e.vertex = this;
        this.editor.onVertexMarkerContextMenu(e);
    },

    onMouseDown: function (e) {
        e.vertex = this;
        this.editor.onVertexMarkerMouseDown(e);
    },

    delete: function () {
        var next = this.getNext();  // Compute before changing latlng
        this.latlngs.splice(this.latlngs.indexOf(this.latlng), 1);
        this.editor.editLayer.removeLayer(this);
        this.editor.onVertexDeleted({latlng: this.latlng, vertex: this});
        if (next) next.resetMiddleMarker();
    },

    onRemove: function (map) {
        if (this.middleMarker) this.middleMarker.delete();
        delete this.latlng.__vertex;
        L.Marker.prototype.onRemove.call(this, map);
    },

    getIndex: function () {
        return this.latlngs.indexOf(this.latlng);
    },

    getLastIndex: function () {
        return this.latlngs.length - 1;
    },

    getPrevious: function () {
        if (this.latlngs.length < 2) return;
        var index = this.getIndex(),
            previousIndex = index - 1;
        if (index === 0 && this.editor.CLOSED) previousIndex = this.getLastIndex();
        var previous = this.latlngs[previousIndex];
        if (previous) return previous.__vertex;
    },

    getNext: function () {
        if (this.latlngs.length < 2) return;
        var index = this.getIndex(),
            nextIndex = index + 1;
        if (index === this.getLastIndex() && this.editor.CLOSED) nextIndex = 0;
        var next = this.latlngs[nextIndex];
        if (next) return next.__vertex;
    },

    addMiddleMarker: function (previous) {
        previous = previous || this.getPrevious();
        if (previous && !this.middleMarker) this.middleMarker = this.editor.addMiddleMarker(previous, this, this.latlngs, this.editor);
    },

    addMiddleMarkers: function () {
        var previous = this.getPrevious();
        if (previous) {
            this.addMiddleMarker(previous);
        }
        var next = this.getNext();
        if (next) {
            next.resetMiddleMarker();
        }
    },

    resetMiddleMarker: function () {
        if (this.middleMarker) this.middleMarker.delete();
        this.addMiddleMarker();
    },

    _initInteraction: function () {
        L.Marker.prototype._initInteraction.call(this);
        L.DomEvent.on(this._icon, 'touchstart', function (e) {this._fireMouseEvent(e);}, this);
    }

});

L.Editable.mergeOptions({
    vertexMarkerClass: L.Editable.VertexMarker
});

L.Editable.MiddleMarker = L.Marker.extend({

    options: {
        zIndex: 10000,
        opacity: 0.5,
        className: 'leaflet-div-icon leaflet-middle-icon'
    },

    initialize: function (left, right, latlngs, editor, options) {
        this.left = left;
        this.right = right;
        this.editor = editor;
        this.latlngs = latlngs;
        L.Marker.prototype.initialize.call(this, this.computeLatLng(), options);
        this.options.icon = this.editor.tools.createVertexIcon({className: this.options.className});
        this.editor.editLayer.addLayer(this);
    },

    updateLatLng: function () {
        this.setLatLng(this.computeLatLng());
    },

    computeLatLng: function () {
        var lat = (this.left.latlng.lat + this.right.latlng.lat) / 2,
            lng = (this.left.latlng.lng + this.right.latlng.lng) / 2;
        return [lat, lng];
    },

    onAdd: function (map) {
        L.Marker.prototype.onAdd.call(this, map);
        this.on('mousedown touchstart', this.onMouseDown);
    },

    onMouseDown: function (e) {
        this.editor.onMiddleMarkerMouseDown(e, this);
        this.latlngs.splice(this.index(), 0, e.latlng);
        this.editor.refresh();
        var marker = this.editor.addVertexMarker(e.latlng, this.latlngs);
        marker.dragging._draggable._onDown(e.originalEvent);  // Transfer ongoing dragging to real marker
        this.delete();
    },

    delete: function () {
        this.editor.editLayer.removeLayer(this);
    },

    onRemove: function (map) {
        delete this.right.middleMarker;
        L.Marker.prototype.onRemove.call(this, map);
    },

    index: function () {
        return this.latlngs.indexOf(this.right.latlng);
    },

    _initInteraction: function () {
        L.Marker.prototype._initInteraction.call(this);
        L.DomEvent.on(this._icon, 'touchstart', function (e) {this._fireMouseEvent(e);}, this);
    }

});

L.Editable.mergeOptions({
    middleMarkerClass: L.Editable.MiddleMarker
});

L.Editable.BaseEditor = L.Class.extend({

    initialize: function (map, feature, options) {
        L.setOptions(this, options);
        this.map = map;
        this.feature = feature;
        this.feature.editor = this;
        this.editLayer = new L.LayerGroup();
        this.tools = this.options.tools || map.editTools;
    },

    enable: function () {
        this.tools.editLayer.addLayer(this.editLayer);
        this.onEnable();
        this._enabled = true;
        return this;
    },

    disable: function () {
        this.editLayer.clearLayers();
        this.tools.editLayer.removeLayer(this.editLayer);
        this.onDisable();
        delete this._enabled;
        if (this.drawing) this.cancelDrawing();
        return this;
    },

    _fireAndForward: function (type, e) {
        e = e || {};
        e.layer = this.feature;
        this.feature.fire(type, e);
        if (this.feature.multi) this.feature.multi.fire(type, e);
        this.map.fire(type, e);
    },

    onEnable: function () {
        this._fireAndForward('editable:enable');
    },

    onDisable: function () {
        this._fireAndForward('editable:disable');
    },

    onEditing: function () {
        this._fireAndForward('editable:editing');
    },

    onStartDrawing: function () {
        this._fireAndForward('editable:drawing:start');
    },

    onEndDrawing: function () {
        this._fireAndForward('editable:drawing:end');
    },

    onCancelDrawing: function () {
        this._fireAndForward('editable:drawing:cancel');
    },

    onFinishDrawing: function () {
        this._fireAndForward('editable:drawing:finish');
    },

    startDrawing: function () {
        if (!this.drawing) this.drawing = L.Editable.FORWARD;
        this.tools.registerForDrawing(this);
        this.onStartDrawing();
    },

    finishDrawing: function () {
        this.endDrawing();
        this.onFinishDrawing();
    },

    cancelDrawing: function () {
        this.endDrawing();
        this.onCancelDrawing();
    },

    endDrawing: function () {
        this.drawing = false;
        this.tools.unregisterForDrawing(this);
        this.onEndDrawing();
    },

    onMouseMove: function (e) {
        if (this.drawing) {
            this.tools.newClickHandler.setLatLng(e.latlng);
        }
    },

    onTouch: function (e) {
        this.onMouseMove(e);
        if (this.drawing) this.tools.newClickHandler._fireMouseEvent(e);
    },

    onNewClickHandlerClicked: function (e) {
        if (!this.isNewClickValid(e.latlng)) return;
        this._fireAndForward('editable:drawing:click', e);
        return true;
    },

    isNewClickValid: function (latlng) {
        return true;
    }

});

L.Editable.MarkerEditor = L.Editable.BaseEditor.extend({

    enable: function () {
        L.Editable.BaseEditor.prototype.enable.call(this);
        this.feature.dragging.enable();
        this.feature.on('dragstart', this.onEditing, this);
        return this;
    },

    disable: function () {
        L.Editable.BaseEditor.prototype.disable.call(this);
        this.feature.dragging.disable();
        this.feature.off('dragstart', this.onEditing, this);
        return this;
    },

    onMouseMove: function (e) {
        if (this.drawing) {
            L.Editable.BaseEditor.prototype.onMouseMove.call(this, e);
            this.feature.setLatLng(e.latlng);
            this.tools.newClickHandler._bringToFront();
        }
    },

    onNewClickHandlerClicked: function (e) {
        if (!L.Editable.BaseEditor.prototype.onNewClickHandlerClicked.call(this, e)) return;
        this.finishDrawing();
    }

});

L.Editable.PathEditor = L.Editable.BaseEditor.extend({

    CLOSED: false,
    MIN_VERTEX: 2,

    enable: function () {
        L.Editable.BaseEditor.prototype.enable.call(this);
        if (this.feature) {
            this.initVertexMarkers();
        }
        return this;
    },

    disable: function () {
        L.Editable.BaseEditor.prototype.disable.call(this);
    },

    initVertexMarkers: function () {
        // groups can be only latlngs (for polyline or symple polygon,
        // or latlngs plus many holes, in case of a complex polygon)
        var latLngGroups = this.getLatLngsGroups();
        for (var i = 0; i < latLngGroups.length; i++) {
            this.addVertexMarkers(latLngGroups[i]);
        }
    },

    getLatLngsGroups: function () {
        return [this.getLatLngs()];
    },

    getLatLngs: function () {
        return this.feature.getLatLngs();
    },

    reset: function () {
        this.editLayer.clearLayers();
        this.initVertexMarkers();
    },

    addVertexMarker: function (latlng, latlngs) {
        return new this.tools.options.vertexMarkerClass(latlng, latlngs, this);
    },

    addVertexMarkers: function (latlngs) {
        for (var i = 0; i < latlngs.length; i++) {
            this.addVertexMarker(latlngs[i], latlngs);
        }
    },

    addMiddleMarker: function (left, right, latlngs) {
        return new this.tools.options.middleMarkerClass(left, right, latlngs, this);
    },

    onVertexMarkerClick: function (e, vertex) {
        var index = e.vertex.getIndex();
        if (e.originalEvent.ctrlKey) {
            this.onVertexMarkerCtrlClick(e);
        } else if (e.originalEvent.altKey) {
            this.onVertexMarkerAltClick(e);
        } else if (e.originalEvent.shiftKey) {
            this.onVertexMarkerShiftClick(e);
        } else if (index >= 1 && index === e.vertex.getLastIndex() && this.drawing === L.Editable.FORWARD) {
            this.finishDrawing();
        } else if (index === 0 && this.drawing === L.Editable.BACKWARD && this._drawnLatLngs.length >= this.MIN_VERTEX) {
            this.finishDrawing();
        } else if (index === 0 && this.drawing === L.Editable.FORWARD && this._drawnLatLngs.length >= this.MIN_VERTEX && this.CLOSED) {
            this.finishDrawing();  // Allow to close on first point also for polygons
        } else {
            this.onVertexRawMarkerClick(e);
        }
    },

    onVertexRawMarkerClick: function (e) {
        if (!this.vertexCanBeDeleted(e.vertex)) return;
        e.vertex.delete();
        this.refresh();
    },

    vertexCanBeDeleted: function (vertex) {
        return vertex.latlngs.length > this.MIN_VERTEX;
    },

    onVertexDeleted: function (e) {
        this._fireAndForward('editable:vertex:deleted', e);
    },

    onVertexMarkerCtrlClick: function (e) {
        this._fireAndForward('editable:vertex:ctrlclick', e);
    },

    onVertexMarkerShiftClick: function (e) {
        this._fireAndForward('editable:vertex:shiftclick', e);
    },

    onVertexMarkerAltClick: function (e) {
        this._fireAndForward('editable:vertex:altclick', e);
    },

    onVertexMarkerContextMenu: function (e) {
        this._fireAndForward('editable:vertex:contextmenu', e);
    },

    onVertexMarkerMouseDown: function (e) {
        this._fireAndForward('editable:vertex:mousedown', e);
    },

    onMiddleMarkerMouseDown: function (e) {
        this._fireAndForward('editable:middlemarker:mousedown', e);
    },

    startDrawing: function () {
        if (!this._drawnLatLngs) this._drawnLatLngs = this.getLatLngs();
        L.Editable.BaseEditor.prototype.startDrawing.call(this);
    },

    startDrawingForward: function () {
        this.startDrawing();
        this.tools.attachForwardLineGuide();
    },

    endDrawing: function () {
        L.Editable.BaseEditor.prototype.endDrawing.call(this);
        this.tools.detachForwardLineGuide();
        this.tools.detachBackwardLineGuide();
        delete this._drawnLatLngs;
    },

    addLatLng: function (latlng) {
        if (this.drawing === L.Editable.FORWARD) this._drawnLatLngs.push(latlng);
        else this._drawnLatLngs.unshift(latlng);
        this.refresh();
        this.addVertexMarker(latlng, this._drawnLatLngs);
    },

    newPointForward: function (latlng) {
        this.addLatLng(latlng);
        this.tools.anchorForwardLineGuide(latlng);
        if (!this.tools.backwardLineGuide._latlngs[0]) {
            this.tools.anchorBackwardLineGuide(latlng);
        }
    },

    newPointBackward: function (latlng) {
        this.addLatLng(latlng);
        this.tools.anchorBackwardLineGuide(latlng);
    },

    onNewClickHandlerClicked: function (e) {
        if (!L.Editable.BaseEditor.prototype.onNewClickHandlerClicked.call(this, e)) return;
        if (this.drawing === L.Editable.FORWARD) this.newPointForward(e.latlng);
        else this.newPointBackward(e.latlng);
    },

    onMouseMove: function (e) {
        if (this.drawing) {
            L.Editable.BaseEditor.prototype.onMouseMove.call(this, e);
            this.tools.moveForwardLineGuide(e.latlng);
            this.tools.moveBackwardLineGuide(e.latlng);
        }
    },

    refresh: function () {
        this.feature.redraw();
        this.onEditing();
    }

});

L.Editable.PolylineEditor = L.Editable.PathEditor.extend({

    startDrawingBackward: function () {
        this.drawing = L.Editable.BACKWARD;
        this.startDrawing();
        this.tools.attachBackwardLineGuide();
    },

    continueBackward: function () {
        this.tools.anchorBackwardLineGuide(this.getFirstLatLng());
        this.startDrawingBackward();
    },

    continueForward: function () {
        this.tools.anchorForwardLineGuide(this.getLastLatLng());
        this.startDrawingForward();
    },

    getLastLatLng: function () {
        return this.getLatLngs()[this.getLatLngs().length - 1];
    },

    getFirstLatLng: function () {
        return this.getLatLngs()[0];
    }

});

L.Editable.PolygonEditor = L.Editable.PathEditor.extend({

    CLOSED: true,
    MIN_VERTEX: 3,

    getLatLngsGroups: function () {
        var groups = L.Editable.PathEditor.prototype.getLatLngsGroups.call(this);
        if (this.feature._holes) {
            for (var i = 0; i < this.feature._holes.length; i++) {
                groups.push(this.feature._holes[i]);
            }
        }
        return groups;
    },

    startDrawingForward: function () {
        L.Editable.PathEditor.prototype.startDrawingForward.call(this);
        this.tools.attachBackwardLineGuide();
    },

    addNewEmptyHole: function () {
        var holes = Array();
        if (!this.feature._holes) {
            this.feature._holes = [];
        }
        this.feature._holes.push(holes);
        return holes;
    },

    newHole: function (latlng) {
        this._drawnLatLngs = this.addNewEmptyHole();
        this.startDrawingForward();
        if (latlng) this.newPointForward(latlng);
    },

    checkContains: function (latlng) {
        return this.feature._containsPoint(this.map.latLngToLayerPoint(latlng));
    },

    vertexCanBeDeleted: function (vertex) {
        if (vertex.latlngs === this.getLatLngs()) return L.Editable.PathEditor.prototype.vertexCanBeDeleted.call(this, vertex);
        else return true;  // Holes can be totally deleted without removing the layer itself
    },

    isNewClickValid: function (latlng) {
        if (this._drawnLatLngs !== this.getLatLngs()) return this.checkContains(latlng);
        return true;
    },

    onVertexDeleted: function (e) {
        L.Editable.PathEditor.prototype.onVertexDeleted.call(this, e);
        if (!e.vertex.latlngs.length && e.vertex.latlngs !== this.getLatLngs()) {
            this.feature._holes.splice(this.feature._holes.indexOf(e.vertex.latlngs), 1);
        }
    }

});

L.Map.mergeOptions({
    polylineEditorClass: L.Editable.PolylineEditor
});

L.Map.mergeOptions({
    polygonEditorClass: L.Editable.PolygonEditor
});

L.Map.mergeOptions({
    markerEditorClass: L.Editable.MarkerEditor
});

var EditableMixin = {

    createEditor: function (map) {
        map = map || this._map;
        var Klass = this.options.editorClass || this.getEditorClass(map);
        return new Klass(map, this);
    },

    enableEdit: function () {
        if (!this.editor) {
            this.createEditor();
            this.on('remove', this.disableEdit);
        }
        return this.editor.enable();
    },

    editEnabled: function () {
        return this.editor && this.editor._enabled;
    },

    disableEdit: function () {
        if (this.editor) {
            this.editor.disable();
            this.off('remove', this.disableEdit);
            delete this.editor;
        }
    },

    toggleEdit: function () {
      if (this.editor) {
        this.disableEdit();
      } else {
        this.enableEdit();
      }
    },

    connectCreatedToMap: function (map) {
        return this.addTo(map);
    }

};

L.Polyline.include(EditableMixin);
L.Polygon.include(EditableMixin);
L.Marker.include(EditableMixin);

L.Polyline.include({

    _containsPoint: function (p, closed) {  // Copy-pasted from Leaflet
        var i, j, k, len, len2, dist, part,
            w = this.options.weight / 2;

        if (L.Browser.touch) {
            w += 10; // polyline click tolerance on touch devices
        }

        for (i = 0, len = this._parts.length; i < len; i++) {
            part = this._parts[i];
            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                if (!closed && (j === 0)) {
                    continue;
                }

                dist = L.LineUtil.pointToSegmentDistance(p, part[k], part[j]);

                if (dist <= w) {
                    return true;
                }
            }
        }
        return false;
    },

    getEditorClass: function (map) {
        return map.options.polylineEditorClass;
    }

});
L.Polygon.include({

    _containsPoint: function (p) {  // Copy-pasted from Leaflet
        var inside = false,
            part, p1, p2,
            i, j, k,
            len, len2;

        // TODO optimization: check if within bounds first

        if (L.Polyline.prototype._containsPoint.call(this, p, true)) {
            // click on polygon border
            return true;
        }

        // ray casting algorithm for detecting if point is in polygon

        for (i = 0, len = this._parts.length; i < len; i++) {
            part = this._parts[i];

            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                p1 = part[j];
                p2 = part[k];

                if (((p1.y > p.y) !== (p2.y > p.y)) &&
                        (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
                    inside = !inside;
                }
            }
        }

        return inside;
    },

    getEditorClass: function (map) {
        return map.options.polygonEditorClass;
    }

});

L.Marker.include({

    getEditorClass: function (map) {
        return map.options.markerEditorClass;
    }

});

var MultiEditableMixin = {

    enableEdit: function (e) {
        this.eachLayer(function(layer) {
            layer.multi = this;
            layer.enableEdit();
        }, this);
    },

    disableEdit: function () {
        this.eachLayer(function(layer) {
            layer.disableEdit();
        });
    },

    toggleEdit: function (e) {
        if (!e.layer.editor) {
            this.enableEdit(e);
        } else {
            this.disableEdit();
        }
    }

};
L.MultiPolygon.include(MultiEditableMixin);
L.MultiPolyline.include(MultiEditableMixin);
