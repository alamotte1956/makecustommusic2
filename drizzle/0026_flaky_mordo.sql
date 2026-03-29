ALTER TABLE `songs` ADD `sheetMusicStatus` enum('pending','generating','done','failed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `songs` ADD `sheetMusicError` text;