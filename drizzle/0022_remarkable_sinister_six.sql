CREATE TABLE `shared_lyrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`ownerId` int NOT NULL,
	`ownerName` varchar(255),
	`title` varchar(255) NOT NULL DEFAULT 'Untitled Song',
	`genre` varchar(100),
	`mood` varchar(100),
	`vocalType` varchar(20),
	`sections` json NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT true,
	`editCount` int NOT NULL DEFAULT 0,
	`lastEditorName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shared_lyrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `shared_lyrics_shareToken_unique` UNIQUE(`shareToken`)
);
