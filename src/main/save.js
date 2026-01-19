var FSM_VERSIONS_KEY = 'fsm:versions';

function hasLocalStorage() {
	return !!(localStorage && JSON);
}

function createBackup() {
	var backup = {
		'nodes': [],
		'links': [],
	};
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var backupNode = {
			'x': node.x,
			'y': node.y,
			'text': node.text,
			'isAcceptState': node.isAcceptState,
		};
		backup.nodes.push(backupNode);
	}
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if(link instanceof SelfLink) {
			backupLink = {
				'type': 'SelfLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'anchorAngle': link.anchorAngle,
			};
		} else if(link instanceof StartLink) {
			backupLink = {
				'type': 'StartLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'deltaX': link.deltaX,
				'deltaY': link.deltaY,
			};
		} else if(link instanceof Link) {
			backupLink = {
				'type': 'Link',
				'nodeA': nodes.indexOf(link.nodeA),
				'nodeB': nodes.indexOf(link.nodeB),
				'text': link.text,
				'lineAngleAdjust': link.lineAngleAdjust,
				'parallelPart': link.parallelPart,
				'perpendicularPart': link.perpendicularPart,
			};
		}
		if(backupLink != null) {
			backup.links.push(backupLink);
		}
	}

	return backup;
}

function applyBackup(backup) {
	nodes.length = 0;
	links.length = 0;
	selectedObject = null;
	currentLink = null;
	movingObject = false;

	if(!backup || !backup.nodes || !backup.links) {
		return;
	}

	for(var i = 0; i < backup.nodes.length; i++) {
		var backupNode = backup.nodes[i];
		var node = new Node(backupNode.x, backupNode.y);
		node.isAcceptState = backupNode.isAcceptState;
		node.text = backupNode.text;
		nodes.push(node);
	}
	for(var i = 0; i < backup.links.length; i++) {
		var backupLink = backup.links[i];
		var link = null;
		if(backupLink.type == 'SelfLink') {
			link = new SelfLink(nodes[backupLink.node]);
			link.anchorAngle = backupLink.anchorAngle;
			link.text = backupLink.text;
		} else if(backupLink.type == 'StartLink') {
			link = new StartLink(nodes[backupLink.node]);
			link.deltaX = backupLink.deltaX;
			link.deltaY = backupLink.deltaY;
			link.text = backupLink.text;
		} else if(backupLink.type == 'Link') {
			link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
			link.parallelPart = backupLink.parallelPart;
			link.perpendicularPart = backupLink.perpendicularPart;
			link.text = backupLink.text;
			link.lineAngleAdjust = backupLink.lineAngleAdjust;
		}
		if(link != null) {
			links.push(link);
		}
	}
}

function restoreBackup() {
	if(!hasLocalStorage()) {
		return;
	}

	try {
		var backup = JSON.parse(localStorage['fsm']);
		applyBackup(backup);
	} catch(e) {
		localStorage['fsm'] = '';
	}
}

function saveBackup() {
	if(!hasLocalStorage()) {
		return;
	}

	var backup = createBackup();
	localStorage['fsm'] = JSON.stringify(backup);
}

function pad2(value) {
	return value < 10 ? '0' + value : '' + value;
}

function formatTimestamp(ms) {
	var date = new Date(ms);
	return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + ' ' +
		pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

function defaultVersionName() {
	return 'Version ' + formatTimestamp(Date.now());
}

function isBackupEmpty(backup) {
	return !backup || (backup.nodes.length === 0 && backup.links.length === 0);
}

function getSavedVersions() {
	if(!hasLocalStorage()) {
		return [];
	}
	var raw = localStorage[FSM_VERSIONS_KEY];
	if(!raw) {
		return [];
	}
	try {
		var versions = JSON.parse(raw);
		return Array.isArray(versions) ? versions : [];
	} catch(e) {
		localStorage[FSM_VERSIONS_KEY] = '';
		return [];
	}
}

function setSavedVersions(versions) {
	if(!hasLocalStorage()) {
		return;
	}
	localStorage[FSM_VERSIONS_KEY] = JSON.stringify(versions);
}

function saveCurrentVersion(name, options) {
	if(!hasLocalStorage()) {
		return null;
	}
	var backup = createBackup();
	if(!options || options.allowEmpty !== true) {
		if(isBackupEmpty(backup)) {
			return null;
		}
	}
	var now = Date.now();
	var entry = {
		'id': String(now) + '-' + Math.floor(Math.random() * 1000000),
		'name': name && name.trim() ? name.trim() : defaultVersionName(),
		'createdAt': now,
		'backup': backup,
	};
	var versions = getSavedVersions();
	versions.push(entry);
	setSavedVersions(versions);
	return entry;
}

function deleteSavedVersion(id) {
	var versions = getSavedVersions();
	var filtered = [];
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id !== id) {
			filtered.push(versions[i]);
		}
	}
	setSavedVersions(filtered);
}

function loadSavedVersion(id) {
	var versions = getSavedVersions();
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id === id) {
			applyBackup(versions[i].backup);
			return versions[i];
		}
	}
	return null;
}

function loadLatestVersion() {
	var versions = getSavedVersions();
	if(versions.length === 0) {
		return null;
	}
	versions.sort(function(a, b) {
		return b.createdAt - a.createdAt;
	});
	var latest = versions[0];
	applyBackup(latest.backup);
	return latest;
}
