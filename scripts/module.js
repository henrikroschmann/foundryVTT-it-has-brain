import { registerSettings, moduleName } from './settings.js';
import { getActorIdFromChatMessage } from './helpers/getActors.js'
import { initiateNpcConversations, npcBackgroundGenerator, npcConversation } from './npcHandler.js';
import { getGptReplyAsHtml } from './chat-gpt.js';

Hooks.once('init', () => {
	console.log(`${moduleName} | Initialization`);
	registerSettings();

	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("it-has-brain", ExtendedActorSheet, { makeDefault: false });

});

Hooks.on('chatMessage', async (chatLog, message, _chatData) => {
	if (message.startsWith('?')) {
		// you have some questions regarding the system
		const output = message.replace(/\?/g, '');
		const reply = await getGptReplyAsHtml(output);

		const abbr = "Provided to you by the gods";
		await ChatMessage.create({
			user: game.user.id,
			speaker: ChatMessage.getSpeaker({ alias: 'GPT' }),
			content: `<abbr title="${abbr}" class="ask-chatgpt-to fa-solid fa-microchip-ai"></abbr>
				<span class="ask-chatgpt-reply">${reply}</span>`,			
			sound: CONFIG.sounds.notification,
		});
	}
	if (message.startsWith('@')) {
		// you tried to target a actor in the scene
		try {
			const regex = /@([\w\s]+)\s(.+)/g;
			const messagesArray = [];

			let match;
			while ((match = regex.exec(message))) {
				const receiver = match[1].replace(/_/g, ' ');
				const msg = match[2];

				messagesArray.push({ receiver, message: msg });
				const actorId = getActorIdFromChatMessage(messagesArray)

				if (actorId != "") {
					await npcConversation(actorId, messagesArray)
				}
			}
		} catch (error) { /* empty */ }
	}
})

let npcConversationActive = false;

Hooks.on('renderActorDirectory', (app, html, _data) => {
	const button = $(`<button type="button" id="toggle-npc-conversation">Toggle NPC Conversations</button>`);
	button.on('click', () => {
		if (npcConversationActive) {
			clearInterval(npcConversationActive);
			npcConversationActive = false;
			ui.notifications.info("NPC Conversation has been stopped");
		} else {
			npcConversationActive = setInterval(initiateNpcConversations, 600);
			ui.notifications.info("NPC Conversation has started");
		}
	});
	html.find('.directory-footer').append(button);
});




Hooks.once('ready', async function () {
	game.socket.on("module.it-has-brain.generateBackground", async (data) => {
		console.log("Received socket event for background generation:", data);

		// Perform background generation logic based on the received data
		npcBackgroundGenerator(actorId)
		const actorId = data.actorId;


		// Emit the generated background back to the ExtendedActorSheet
		game.socket.emit("module.it-has-brain.generatedBackground", { actorId, background: generatedBackground });

		console.log("Socket event emitted for generated background.");
	});
});


// Define the ActorSheet extension
class ExtendedActorSheet extends ActorSheet {
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			tabs: [{ navSelector: ".tabs", contentSelector: ".tab-content", initial: "description" }],
			classes: ["sheet", "actor-sheet"],
			template: "modules/it-has-brain/templates/extended-actor-sheet.html",
			width: 600,
			height: 800,
		});
	}

	get template() {
		return "modules/it-has-brain/templates/extended-actor-sheet.html";
	}

	getData() {
		const superData = super.getData();
		const data = {
			actorName: this.actor.name,
			background: this.actor.getFlag('it-has-brain', 'background') || '',
			journal: this.actor.getFlag('it-has-brain', 'journal') || '',
		};
		return mergeObject(superData, data);
	}

	activateListeners(html) {
		super.activateListeners(html);

		game.socket.on("module.it-has-brain.journalUpdated", (data) => {
			if (data.actorId === this.actor.id) {
				this.render();
			}
		});
		game.socket.on("module.it-has-brain.generatedBackground", (data) => {
			if (data.actorId === this.actor.id) {
				this.render();
			}
		});
	}
}
