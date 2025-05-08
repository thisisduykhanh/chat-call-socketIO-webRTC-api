const socket = io("http://localhost:8080", {
	extraHeaders: {
		Authorization:
			"Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3Zjc0YzE5NTcwNzk3YmUxNWM1NzgwNyIsInVzZXJuYW1lIjoiMTEyMDExOTY3MjA0NjQ5NjE1MDQ0Iiwic2Vzc2lvbklkIjoiMGYyNzE2Y2ItNmU2OS00M2QyLWFkNjEtZDJlOGFmY2UwYzk3IiwiaWF0IjoxNzQ1OTAxNDg5LCJleHAiOjE3NDU5MDMyODl9.iPttpeVLJZAAWko_AZgXPpUMytlNib_iTBiBPSn6lN4wnBYb_qUbYlZkn5O_y8uDOwg0VFnHWhZif8A1KXsNS0pU47MrYZK-Qnd38L-ktGOE10pP2BLYZ07uyWvFnZtYeeL4dqK-rCEBkn0t6YjIA1VKsR3knauVRQF81NU6sJZFtibfgjci2cXHsq8vNRdaDP_fNki0WT-uqErB-cC93Zq6sSmdjn1QbUyMTWfUG5V0fBFJ1eV3iSMN3f6XjGxn3YE4vXyxbaQma0RAkdzf8u3yaR-kMHdi5ImorCMzo8aZz7JvRmN373ltS2Cspg15OMWD_wNMPgS90O741cGtAw",
	},
});
let localStream;
let peerConnections = {};
const configuration = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const localVideo = document.getElementById("localVideo");
const videosContainer = document.getElementById("videos");
const callPopup = document.getElementById("callPopup");
const callerIdSpan = document.getElementById("callerId");
const errorMessage = document.getElementById("errorMessage");
let currentConversationId;
let currentUserId;
let initiatorId;

async function joinConversation() {
	currentConversationId = document.getElementById("conversationId").value;
	currentUserId = document.getElementById("userId").value;

	if (!currentConversationId || !currentUserId) {
		alert("Please enter both Conversation ID and User ID");
		return;
	}

	// Lấy stream từ camera/mic
	try {
		localStream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true,
		});
		localVideo.srcObject = localStream;
	} catch (err) {
		alert(`Failed to access camera/microphone: ${err.message}`);
		return;
	}

	socket.emit("join-conversation", {
		conversationId: currentConversationId,
		userId: currentUserId,
	});
}

function startCall() {
	socket.emit("start-call", { conversationId: currentConversationId });
}

function acceptCall() {
	callPopup.style.display = "none";
	errorMessage.style.display = "none";
	socket.emit("accept-call", {
		conversationId: currentConversationId,
		toUserId: initiatorId,
	});
}

function rejectCall() {
	callPopup.style.display = "none";
	errorMessage.style.display = "none";
	socket.emit("reject-call", { conversationId: currentConversationId });
}

function createPeerConnection(targetUserId) {
	const peerConnection = new RTCPeerConnection(configuration);
	peerConnections[targetUserId] = peerConnection;
	// Thêm stream vào peer connection
	for (const track of localStream.getTracks()) {
		peerConnection.addTrack(track, localStream);
	}

	// Xử lý ICE candidates
	peerConnection.onicecandidate = (event) => {
		if (event.candidate) {
			socket.emit("ice-candidate", {
				toUserId: targetUserId,
				candidate: event.candidate,
			});
		}
	};

	// Xử lý stream từ remote
	peerConnection.ontrack = (event) => {
		let remoteVideo = document.getElementById(`video-${targetUserId}`);
		if (!remoteVideo) {
			remoteVideo = document.createElement("video");
			remoteVideo.id = `video-${targetUserId}`;
			remoteVideo.autoplay = true;
			remoteVideo.playsinline = true;
			videosContainer.appendChild(remoteVideo);
		}
		remoteVideo.srcObject = event.streams[0];
	};

	// Tạo offer nếu là người gọi hoặc người vừa tham gia
	peerConnection
		.createOffer()
		.then((offer) => {
			peerConnection.setLocalDescription(offer);
			socket.emit("call-offer", { toUserId: targetUserId, offer });
		})
		.catch((err) => console.error("Error creating offer:", err));

	return peerConnection;
}

socket.on("call-incoming", ({ initiatorId: caller }) => {
	initiatorId = caller;
	callerIdSpan.textContent = caller;
	callPopup.style.display = "block";
	errorMessage.style.display = "none";
});

socket.on("call-accepted", ({ toUserId }) => {
	createPeerConnection(toUserId);
});

socket.on("call-rejected", ({ userId }) => {
	alert(`${userId} rejected the call`);
});

socket.on("user-joined-call", ({ userId }) => {
	if (userId !== currentUserId) {
		createPeerConnection(userId);
	}
});

socket.on("call-offer", async ({ fromUserId, offer }) => {
	let peerConnection = peerConnections[fromUserId];
	if (!peerConnection) {
		peerConnection = createPeerConnection(fromUserId);
	}

	try {
		await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
		const answer = await peerConnection.createAnswer();
		await peerConnection.setLocalDescription(answer);
		socket.emit("call-answer", { toUserId: fromUserId, answer });
	} catch (err) {
		console.error("Error handling offer:", err);
	}
});

socket.on("call-answer", async ({ fromUserId, answer }) => {
	const peerConnection = peerConnections[fromUserId];
	if (peerConnection) {
		try {
			await peerConnection.setRemoteDescription(
				new RTCSessionDescription(answer),
			);
		} catch (err) {
			console.error("Error handling answer:", err);
		}
	}
});

socket.on("ice-candidate", async ({ fromUserId, candidate }) => {
	const peerConnection = peerConnections[fromUserId];
	if (peerConnection) {
		try {
			await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
		} catch (err) {
			console.error("Error handling ICE candidate:", err);
		}
	}
});

socket.on("user-connected", ({ userId }) => {
	console.log(`${userId} joined the conversation`);
});

socket.on("user-disconnected", ({ userId }) => {
	const video = document.getElementById(`video-${userId}`);
	if (video) video.remove();
	if (peerConnections[userId]) {
		peerConnections[userId].close();
		delete peerConnections[userId];
	}
	console.log(`${userId} left the conversation`);
});

socket.on("call-ended", () => {
	for (const pc of Object.values(peerConnections)) {
		pc.close();
	}
	peerConnections = {};
	while (videosContainer.children.length > 1) {
		videosContainer.removeChild(videosContainer.lastChild);
	}
	callPopup.style.display = "none";
	errorMessage.style.display = "none";
});

socket.on("call-error", ({ message }) => {
	callPopup.style.display = "block";
	errorMessage.style.display = "block";
	errorMessage.textContent = message;
	setTimeout(() => {
		callPopup.style.display = "none";
		errorMessage.style.display = "none";
	}, 3000);
});
