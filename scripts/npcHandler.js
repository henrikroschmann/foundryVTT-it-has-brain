import { getGptReplyAsHtml } from "./chat-gpt.js";

export async function npcConversation(actorId, messagesArray) {
	let actor = game.actors.get(actorId);
	let background = actor.getFlag("it-has-brain", "background");

	// If no background is found, generate it on the fly
	if (!background) {
		await npcBackgroundGenerator(actorId);
		background = actor.getFlag("it-has-brain", "background");
	}
	let conversationHistory = actor.getFlag("it-has-brain", "journal") ?? [];

	let prompt = `You are part of a table top RPG and are role-playing as ${actor.name}, who has the following background: ${background}. 
    In this role, you should remain in character at all times and your responses should reflect the decisions and conversations 
    ${actor.name} has had in the past.

    Here is some context from previous conversations:`;

	for (let i = 0; i < conversationHistory.length; i++) {
		prompt += ` \n${conversationHistory[i].character}: "${conversationHistory[i].message}"`;
	}

	prompt += ` \nNow, ${actor.name} has just received the following message from ${messagesArray[0].sender}: "${messagesArray[0].message}". 
  Given the context and ${actor.name}'s background, how would ${actor.name} respond?`;


	var data = await getGptReplyAsHtml(prompt)

	// Update the actor's public notes (journal)
	conversationHistory.push({
		character: actor.name,
		message: data
	});

	// If conversation history exceeds certain length, trim it
	if (conversationHistory.length > 50) { // choose a suitable length
		conversationHistory = conversationHistory.slice(-50);
	}

	await actor.setFlag("it-has-brain", "journal", conversationHistory);

	game.socket.emit("module.it-has-brain.journalUpdated", { actorId: actor.id });

	await ChatMessage.create({
		user: game.user.id,
		speaker: {
			actor: actor,
			alias: actor.name
		},
		content: data,
		sound: CONFIG.sounds.notification,
	});
}


export async function npcBackgroundGenerator(actorId) {
	const actor = game.actors.get(actorId)
	if (actor) {
		console.log("For debugging, here is the actor model ", actor)
		const generatedBackground = await getGptReplyAsHtml(`Generate a background story for this character name ${actor.name} and traits ${actor.data.system.traits.value.join(",")}`);
		await actor.setFlag("it-has-brain", "background", generatedBackground);
		game.socket.emit("module.it-has-brain.generatedBackground", { actorId, background: generatedBackground });
	}
}


// Function for initiating NPC conversations
export async function initiateNpcConversations() {
	// Get all tokens in the current scene
	let tokens = canvas.tokens.placeables;

	// Filter out NPC tokens
	let npcTokens = tokens.filter(t => t.document._actor.type === 'npc');

	// Check if there are at least 2 NPCs in the scene
	if (npcTokens.length < 2) return;

	// Select two random NPC tokens for conversation
	let [npc1, npc2] = getRandomPair(npcTokens);

	// Start conversation
	await npcIntenralConversation(npc1.document.actorId, npc2.document.actorId);
}

// Function for getting a random pair of elements from an array
function getRandomPair(arr) {
	let i = Math.floor(Math.random() * arr.length);
	let j;
	do {
		j = Math.floor(Math.random() * arr.length);
	} while (j === i);
	return [arr[i], arr[j]];
}

// Function for handling NPC conversations
async function npcIntenralConversation(actorId1, actorId2) {
	let actor1 = game.actors._source.find(a => a._id === actorId1)
	let actor2 = game.actors._source.find(a => a._id === actorId2)

	// Generate a conversation between actor1 and actor2
	let message1 = await generateMessage(actor1, actor2);
	let message2 = await generateMessage(actor2, actor1);

	let speaker1 = ChatMessage.getSpeaker({ actor: actor1 });
	let speaker2 = ChatMessage.getSpeaker({ actor: actor2 });

	// Speaker 1 sends the first message
	await ChatMessage.create({ user: game.user.id, speaker: speaker1, content: message1 });

	// Introduce a delay
	await new Promise(resolve => setTimeout(resolve, 5000));  // Delay for 5000 ms, or 5 seconds

	// Speaker 2 sends the second message
	await ChatMessage.create({ user: game.user.id, speaker: speaker2, content: message2 });


}

// Function for generating a message from one actor to another
async function generateMessage(sender, receiver) {
	// Insert code here for generating a message from `sender` to `receiver`
	// This could involve calling your `getGptReplyAsHtml` function with a suitable prompt
	// For the sake of simplicity, we'll return a hardcoded string
	return `${sender.name} says something to ${receiver.name}.`;
}