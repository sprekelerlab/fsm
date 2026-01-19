var greekLetterNames = [ 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega' ];
var squareSymbolNames = [ 'Blank', 'Square' ];

function convertLatexShortcuts(text) {
	// html greek characters
	for(var i = 0; i < greekLetterNames.length; i++) {
		var name = greekLetterNames[i];
		text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(913 + i + (i > 16)));
		text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(945 + i + (i > 16)));
	}

	// blank/square symbol
	for(var i = 0; i < squareSymbolNames.length; i++) {
		var name = squareSymbolNames[i];
		text = text.replace(new RegExp('\\\\' + name, 'g'), String.fromCharCode(9633));
		text = text.replace(new RegExp('\\\\' + name.toLowerCase(), 'g'), String.fromCharCode(9633));
	}

	// subscripts
	for(var i = 0; i < 10; i++) {
		text = text.replace(new RegExp('_' + i, 'g'), String.fromCharCode(8320 + i));
	}

	return text;
}

function clampCaretIndex(text) {
	if(caretIndex < 0) {
		caretIndex = 0;
	} else if(caretIndex > text.length) {
		caretIndex = text.length;
	}
}

function getCaretDisplayInfo(originalText, index) {
	var before = originalText.substring(0, index);
	var displayBefore = convertLatexShortcuts(before);
	var lines = displayBefore.split('\n');
	return {
		'lineIndex': lines.length - 1,
		'lineText': lines[lines.length - 1]
	};
}

function getCaretLineAndColumn(originalText, index) {
	var lines = originalText.split('\n');
	var remaining = index;
	for(var i = 0; i < lines.length; i++) {
		if(remaining <= lines[i].length) {
			return { 'lineIndex': i, 'column': remaining };
		}
		remaining -= lines[i].length + 1;
	}
	return { 'lineIndex': lines.length - 1, 'column': lines[lines.length - 1].length };
}

function getCaretIndexFromLineColumn(originalText, lineIndex, column) {
	var lines = originalText.split('\n');
	if(lines.length === 0) {
		return 0;
	}
	lineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));
	column = Math.max(0, Math.min(column, lines[lineIndex].length));
	var index = 0;
	for(var i = 0; i < lineIndex; i++) {
		index += lines[i].length + 1;
	}
	return index + column;
}

function textToXML(text) {
	text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	var result = '';
	for(var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if(c >= 0x20 && c <= 0x7E) {
			result += text[i];
		} else {
			result += '&#' + c + ';';
		}
	}
	return result;
}

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
	c.fill();
}

function canvasHasFocus() {
	return (document.activeElement || document.body) == document.body;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	text = convertLatexShortcuts(originalText);
	c.font = '20px "Times New Roman", serif';
	var lines = text.split('\n');
	var widths = [];
	var width = 0;
	for(var i = 0; i < lines.length; i++) {
		widths[i] = c.measureText(lines[i]).width;
		width = Math.max(width, widths[i]);
	}
	var lineHeight = 24;
	var totalHeight = 20 + (lines.length - 1) * lineHeight;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if(angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (totalHeight / 2 + 5) * (sin > 0 ? 1 : -1);
		var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		var baseY = y - (lines.length - 1) * lineHeight / 2;
		for(var i = 0; i < lines.length; i++) {
			var lineX = x + (width - widths[i]) / 2;
			c.fillText(lines[i], lineX, baseY + i * lineHeight + 6);
		}
		if(isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
			clampCaretIndex(originalText);
			var caretInfo = getCaretDisplayInfo(originalText, caretIndex);
			var lineIndex = Math.max(0, Math.min(caretInfo.lineIndex, lines.length - 1));
			var lineX = x + (width - widths[lineIndex]) / 2;
			var caretX = lineX + c.measureText(caretInfo.lineText).width;
			var caretY = baseY + lineIndex * lineHeight;
			c.beginPath();
			c.moveTo(caretX, caretY - 10);
			c.lineTo(caretX, caretY + 10);
			c.stroke();
		}
	}
}

var caretTimer;
var caretVisible = true;
var caretIndex = 0;
var lastVersionsRender = 0;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

function setCaretToEnd() {
	if(selectedObject != null && 'text' in selectedObject) {
		caretIndex = selectedObject.text.length;
	} else {
		caretIndex = 0;
	}
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var originalClick;

function drawUsing(c) {
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	c.translate(0.5, 0.5);

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : 'black';
		nodes[i].draw(c);
	}
	for(var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (links[i] == selectedObject) ? 'blue' : 'black';
		links[i].draw(c);
	}
	if(currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = 'black';
		currentLink.draw(c);
	}

	c.restore();
}

function draw() {
	drawUsing(canvas.getContext('2d'));
	saveBackup();
	maybeRefreshSavedVersions();
}

function maybeRefreshSavedVersions() {
	var now = Date.now();
	if(now - lastVersionsRender < 1000) {
		return;
	}
	lastVersionsRender = now;
	renderSavedVersions();
}

function selectObject(x, y) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for(var i = 0; i < links.length; i++) {
		if(links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function snapNode(node) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i] == node) continue;

		if(Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if(Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

window.onload = function() {
	canvas = document.getElementById('canvas');
	restoreBackup();
	draw();
	initVersioningUI();

	canvas.onmousedown = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);
		movingObject = false;
		originalClick = mouse;

		if(selectedObject != null) {
			setCaretToEnd();
			if(shift && selectedObject instanceof Node) {
				currentLink = new SelfLink(selectedObject, mouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if(selectedObject.setMouseStart) {
					selectedObject.setMouseStart(mouse.x, mouse.y);
				}
			}
			resetCaret();
		} else if(shift) {
			currentLink = new TemporaryLink(mouse, mouse);
		}

		draw();

		if(canvasHasFocus()) {
			// disable drag-and-drop only if the canvas is already focused
			return false;
		} else {
			// otherwise, let the browser switch the focus away from wherever it was
			resetCaret();
			return true;
		}
	};

	canvas.ondblclick = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);

		if(selectedObject == null) {
			selectedObject = new Node(mouse.x, mouse.y);
			nodes.push(selectedObject);
			setCaretToEnd();
			resetCaret();
			draw();
		} else if(selectedObject instanceof Node) {
			selectedObject.isAcceptState = !selectedObject.isAcceptState;
			draw();
		}
	};

	canvas.onmousemove = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);

		if(currentLink != null) {
			var targetNode = selectObject(mouse.x, mouse.y);
			if(!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if(selectedObject == null) {
				if(targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, mouse);
				}
			} else {
				if(targetNode == selectedObject) {
					currentLink = new SelfLink(selectedObject, mouse);
				} else if(targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
				}
			}
			draw();
		}

		if(movingObject) {
			selectedObject.setAnchorPoint(mouse.x, mouse.y);
			if(selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function(e) {
		movingObject = false;

		if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				setCaretToEnd();
				resetCaret();
			}
			currentLink = null;
			draw();
		}
	};
}

var shift = false;

document.onkeydown = function(e) {
	var key = crossBrowserKey(e);
	var hasTextSelection = selectedObject != null && 'text' in selectedObject;

	if(key == 16) {
		shift = true;
	} else if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key == 13) { // enter key
		if(hasTextSelection) {
			if(shift) {
				selectedObject.text = selectedObject.text.substr(0, caretIndex) + '\n' + selectedObject.text.substr(caretIndex);
				caretIndex += 1;
				resetCaret();
				draw();
			} else {
				selectedObject = null;
				draw();
			}
		}
		return false;
	} else if((key == 37 || key == 39 || key == 36 || key == 35 || key == 38 || key == 40) && hasTextSelection) {
		var text = selectedObject.text;
		if(key == 37) { // left
			caretIndex -= 1;
		} else if(key == 39) { // right
			caretIndex += 1;
		} else if(key == 36) { // home
			caretIndex = 0;
		} else if(key == 35) { // end
			caretIndex = text.length;
		} else if(key == 38 || key == 40) { // up/down
			var caretLine = getCaretLineAndColumn(text, caretIndex);
			var nextLine = caretLine.lineIndex + (key == 38 ? -1 : 1);
			caretIndex = getCaretIndexFromLineColumn(text, nextLine, caretLine.column);
		}
		clampCaretIndex(text);
		resetCaret();
		draw();
		return false;
	} else if(key == 8) { // backspace key
		if(hasTextSelection) {
			if(caretIndex > 0) {
				selectedObject.text = selectedObject.text.substr(0, caretIndex - 1) + selectedObject.text.substr(caretIndex);
				caretIndex -= 1;
				resetCaret();
				draw();
			}
		}

		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	} else if(key == 46) { // delete key
		if(selectedObject != null) {
			for(var i = 0; i < nodes.length; i++) {
				if(nodes[i] == selectedObject) {
					nodes.splice(i--, 1);
				}
			}
			for(var i = 0; i < links.length; i++) {
				if(links[i] == selectedObject || links[i].node == selectedObject || links[i].nodeA == selectedObject || links[i].nodeB == selectedObject) {
					links.splice(i--, 1);
				}
			}
			selectedObject = null;
			draw();
		}
	}
};

document.onkeyup = function(e) {
	var key = crossBrowserKey(e);

	if(key == 16) {
		shift = false;
	}
};

document.onkeypress = function(e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if(!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if(key == 13) {
		// handled in keydown (Shift+Enter for newline, Enter to finish editing)
		return false;
	} else if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
		var text = selectedObject.text;
		clampCaretIndex(text);
		var insert = String.fromCharCode(key);
		selectedObject.text = text.substr(0, caretIndex) + insert + text.substr(caretIndex);
		caretIndex += insert.length;
		resetCaret();
		draw();

		// don't let keys do their actions (like space scrolls down the page)
		return false;
	} else if(key == 8) {
		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	}
};

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
	e = e || window.event;
	var obj = e.target || e.srcElement;
	var x = 0, y = 0;
	while(obj.offsetParent) {
		x += obj.offsetLeft;
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}
	return { 'x': x, 'y': y };
}

function crossBrowserMousePos(e) {
	e = e || window.event;
	return {
		'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
		'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
	};
}

function crossBrowserRelativeMousePos(e) {
	var element = crossBrowserElementPos(e);
	var mouse = crossBrowserMousePos(e);
	return {
		'x': mouse.x - element.x,
		'y': mouse.y - element.y
	};
}

function output(text) {
	var element = document.getElementById('output');
	element.style.display = 'block';
	element.value = text;
}

function clearCanvas() {
	nodes.length = 0;
	links.length = 0;
	selectedObject = null;
	currentLink = null;
	movingObject = false;
	draw();
}

function renderSavedVersions() {
	var list = document.getElementById('versions-list');
	if(!list) {
		return;
	}

	while(list.firstChild) {
		list.removeChild(list.firstChild);
	}

	var versions = getSavedVersions();
	versions.sort(function(a, b) {
		return b.createdAt - a.createdAt;
	});

	if(versions.length === 0) {
		var empty = document.createElement('li');
		empty.className = 'versions-empty';
		empty.textContent = 'Keine gespeicherten Automaten.';
		list.appendChild(empty);
		return;
	}

	for(var i = 0; i < versions.length; i++) {
		var entry = versions[i];
		var item = document.createElement('li');
		item.className = 'version-item';

		var meta = document.createElement('span');
		meta.className = 'version-meta';
		var savedAt = entry.lastSavedAt || entry.createdAt;
		var nameSpan = document.createElement('span');
		nameSpan.className = 'version-name';
		nameSpan.textContent = entry.name;
		var timeSpan = document.createElement('span');
		timeSpan.className = 'version-timestamp';
		timeSpan.textContent = ' (zuletzt gespeichert: ' + formatTimestamp(savedAt) + ')';
		meta.appendChild(nameSpan);
		meta.appendChild(timeSpan);

		var loadButton = document.createElement('button');
		loadButton.className = 'version-load';
		loadButton.type = 'button';
		loadButton.textContent = 'Laden';
		loadButton.onclick = (function(id) {
			return function() {
				saveBackup();
				var loaded = loadSavedVersion(id);
				if(loaded) {
					draw();
				}
				updateCurrentNameInput();
				renderSavedVersions();
			};
		})(entry.id);

		var renameButton = document.createElement('button');
		renameButton.className = 'version-rename';
		renameButton.type = 'button';
		renameButton.textContent = 'Umbenennen';
		renameButton.onclick = (function(id, name) {
			return function() {
				var updated = prompt('Automat umbenennen:', name || '');
				if(updated !== null) {
					renameSavedVersion(id, updated);
					updateCurrentNameInput();
					renderSavedVersions();
				}
			};
		})(entry.id, entry.name);

		var duplicateButton = document.createElement('button');
		duplicateButton.className = 'version-duplicate';
		duplicateButton.type = 'button';
		duplicateButton.textContent = 'Duplizieren';
		duplicateButton.onclick = (function(id) {
			return function() {
				duplicateSavedVersion(id);
				renderSavedVersions();
			};
		})(entry.id);

		var deleteButton = document.createElement('button');
		deleteButton.className = 'version-delete';
		deleteButton.type = 'button';
		deleteButton.textContent = 'Löschen';
		deleteButton.onclick = (function(id, name) {
			return function() {
				var message = name
					? 'Automat "' + name + '" löschen? Dies kann nicht rückgängig gemacht werden.'
					: 'Diesen Automaten löschen? Dies kann nicht rückgängig gemacht werden.';
				if(confirm(message)) {
					deleteSavedVersion(id);
					draw();
					updateCurrentNameInput();
					renderSavedVersions();
				}
			};
		})(entry.id, entry.name);

		item.appendChild(meta);
		item.appendChild(loadButton);
		item.appendChild(renameButton);
		item.appendChild(duplicateButton);
		item.appendChild(deleteButton);
		list.appendChild(item);
	}
}

function updateCurrentNameInput() {
	var input = document.getElementById('current-name');
	if(!input) {
		return;
	}
	var current = getCurrentVersionEntry();
	if(current) {
		input.value = current.name;
	} else {
		input.value = '';
	}
}

function initVersioningUI() {
	var newButton = document.getElementById('new-automaton');
	var nameInput = document.getElementById('current-name');

	if(!newButton) {
		return;
	}

	if(nameInput) {
		nameInput.onchange = function() {
			var current = getCurrentVersionEntry();
			if(current) {
				renameSavedVersion(current.id, nameInput.value);
				updateCurrentNameInput();
				renderSavedVersions();
			}
		};
		nameInput.onkeydown = function(e) {
			if(crossBrowserKey(e) == 13) {
				nameInput.blur();
				return false;
			}
		};
	}

	newButton.onclick = function() {
		saveBackup();
		createNewAutomaton();
		clearCanvas();
		updateCurrentNameInput();
		renderSavedVersions();
	};

	updateCurrentNameInput();
	renderSavedVersions();
}

function saveAsPNG() {
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(canvas.getContext('2d'));
	selectedObject = oldSelectedObject;
	var pngData = canvas.toDataURL('image/png');
	var nameInput = document.getElementById('current-name');
	var baseName = nameInput && nameInput.value ? nameInput.value : 'Automat';
	baseName = baseName.replace(/[\\\/:*?"<>|]+/g, '_').trim();
	if(!baseName) {
		baseName = 'Automat';
	}
	var link = document.createElement('a');
	link.href = pngData;
	link.download = baseName + '.png';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function saveAsSVG() {
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	output(svgData);
	// Chrome isn't ready for this yet, the 'Save As' menu item is disabled
	// document.location.href = 'data:image/svg+xml;base64,' + btoa(svgData);
}

function saveAsLaTeX() {
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter);
	selectedObject = oldSelectedObject;
	var texData = exporter.toLaTeX();
	output(texData);
}
