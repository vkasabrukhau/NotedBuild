//
//  StreakEngine.swift
//  NotedMac
//
//  Local streak logic. The web app tracks daily check-ins server-side; here we
//  derive the same behavior from the device calendar. A check-in on a calendar
//  day adjacent to the last extends the streak; a gap resets it.
//

import Foundation

enum StreakEngine {

    /// Records a check-in for `now`, mutating the streak in place.
    /// Returns true if this was the first check-in of the day (so XP/happiness
    /// rewards should fire), false if the user already checked in today.
    @discardableResult
    static func checkIn(_ streak: UserStreak, now: Date = Date(), calendar: Calendar = .current) -> Bool {
        let today = calendar.startOfDay(for: now)

        if let last = streak.lastCheckinAt {
            let lastDay = calendar.startOfDay(for: last)
            if lastDay == today {
                return false // already counted today
            }
            let dayDiff = calendar.dateComponents([.day], from: lastDay, to: today).day ?? 0
            if dayDiff == 1 {
                streak.currentStreak += 1
            } else {
                streak.currentStreak = 1 // gap -> reset
            }
        } else {
            streak.currentStreak = 1
        }

        streak.longestStreak = max(streak.longestStreak, streak.currentStreak)
        streak.totalCheckins += 1
        streak.lastCheckinAt = now
        streak.updatedAt = now
        return true
    }

    /// Returns true if the streak is still "alive" relative to `now`
    /// (checked in today or yesterday). Used to decide pet happiness decay.
    static func isAlive(_ streak: UserStreak, now: Date = Date(), calendar: Calendar = .current) -> Bool {
        guard let last = streak.lastCheckinAt else { return false }
        let lastDay = calendar.startOfDay(for: last)
        let today = calendar.startOfDay(for: now)
        let dayDiff = calendar.dateComponents([.day], from: lastDay, to: today).day ?? Int.max
        return dayDiff <= 1
    }
}
