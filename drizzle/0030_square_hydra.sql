ALTER TABLE `mp3_sheet_jobs` ADD `instrumentParts` json;--> statement-breakpoint
ALTER TABLE `mp3_sheet_jobs` ADD `partsStatus` enum('idle','generating','done','error') DEFAULT 'idle';