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
