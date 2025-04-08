const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;

const chatbox = document.getElementById("chatbox");
const startButton = document.getElementById("mic-container");
let isListening = false;
let isRecognitionActive = false; // Biến để theo dõi trạng thái thực tế của recognition

// 🎤 Bắt đầu / Dừng nhận diện giọng nói khi nhấn nút
startButton.addEventListener("click", function() {
    this.classList.toggle("active");
    if (this.classList.contains("active")) {
        recognition.start();
        // startButton.textContent = "Start Listening";
        isListening = true;
        // isRecognitionActive = false;
    } else {
        recognition.stop();
        // startButton.textContent = "Stop Listening";
        isListening = false;
        // isRecognitionActive = true;
    }
});

// 🎤 Nhận diện giọng nói & gửi tin nhắn tự động
recognition.onresult = event => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    displayMessage(transcript, "user");
    sendMessageToBot(transcript);
};

// recognition.onend = () => {
//     isRecognitionActive = false; // Cập nhật trạng thái khi recognition dừng
//     console.log("Recognition ended.");
//     if (isListening && !isRecognitionActive) {
//         recognition.start();
//         isRecognitionActive = true;
//     }
// };

// 📩 Hiển thị tin nhắn trên giao diện chat
function displayMessage(message, sender) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender === "user" ? "user-message" : "bot-message");
    messageElement.textContent = message;
    chatbox.appendChild(messageElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// 🚀 Gửi tin nhắn đến Dialogflow Messenger
function sendMessageToBot(message) {
    const chatboxElement = document.querySelector("df-messenger");
    if (!chatboxElement) return;

    const chatInputContainer = chatboxElement.shadowRoot?.querySelector("df-messenger-chat")?.shadowRoot;
    if (!chatInputContainer) return;

    const chatInput = chatInputContainer.querySelector("df-messenger-user-input");
    if (!chatInput) return;

    const inputField = chatInput.shadowRoot?.querySelector("input");
    const sendButton = chatInput.shadowRoot?.querySelector("button");

    if (inputField && sendButton) {
        inputField.value = message;
        sendButton.click();
    }
}

// 📡 Lắng nghe phản hồi từ chatbot & hiển thị lên giao diện chat
window.addEventListener("df-response-received", async (event) => {
    console.log("Raw response event:", event.detail.response); // Debug toàn bộ phản hồi từ bot

    const queryResult = event.detail.response.queryResult;
    if (!queryResult || !queryResult.fulfillmentMessages) {
        console.warn("No fulfillment messages found in response.");
        return;
    }

    // Duyệt qua fulfillmentMessages & lấy tin nhắn bot
    const messages = queryResult.fulfillmentMessages
        .filter(msg => msg.text && msg.text.text) // Chỉ lấy tin nhắn có dữ liệu text
        .map(msg => msg.text.text.join(" ")); // Lấy nội dung tin nhắn

    if (messages.length > 0) {
        const botReply = messages.join("\n");
        console.log("Bot response:", botReply); // Log phản hồi từ bot
        displayMessage(botReply, "bot");
    } else {
        console.warn("Bot responded but no text message found.");
    }
});