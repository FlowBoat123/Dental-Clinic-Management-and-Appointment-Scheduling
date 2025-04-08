window.addEventListener("load", function () {
    const botContainer = document.createElement("div");
    botContainer.innerHTML = `
      <df-messenger
        intent="WELCOME"
        chat-title="Trợ Lý Đặt Lịch"
        agent-id="68444991-08e7-47f3-8ad2-bd89bdc3863f"
        language-code="vi">
      </df-messenger>
      <script src="https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=1"></script>
    `;
    document.body.appendChild(botContainer);
  });
  