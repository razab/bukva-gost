import XCTest
import UIKit

final class TabletTests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "md.dcor.bukvygost.pilot.qa")

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.buttons["show-letters"].waitForExistence(timeout: 15))
    }
    override func tearDownWithError() throws { XCUIDevice.shared.orientation = .portrait }
    private func orient(_ orientation: UIDeviceOrientation) {
        XCUIDevice.shared.orientation = orientation
        let landscape = orientation.isLandscape
        let predicate = NSPredicate { _, _ in (self.app.frame.width > self.app.frame.height) == landscape }
        XCTAssertTrue(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: predicate, object: nil)], timeout: 8) == .completed)

    }
    private func close() {
        if !app.buttons["close-sheet"].exists { app.navigationBars.buttons["Настройки"].tap() }
        app.buttons["close-sheet"].tap()
    }
    private func settings() {
        app.buttons["lesson-menu"].tap()
        app.buttons["Настройки"].tap()
        XCTAssertTrue(app.navigationBars["Настройки"].waitForExistence(timeout: 5))
    }
    private func select(_ code: String) {
        app.buttons["show-letters"].tap()
        let letter = app.buttons["letter-" + code]
        XCTAssertTrue(letter.waitForExistence(timeout: 5))
        letter.tap()
        XCTAssertTrue(app.buttons["close-sheet"].waitForNonExistence(timeout: 5))
    }
    private func scrollTo(_ element: XCUIElement, attempts: Int = 4) {
        for _ in 0..<attempts where !element.isHittable {
            // Scroll within the sheet, not the worksheet behind it.
            let region = app.collectionViews.firstMatch.exists ? app.collectionViews.firstMatch : (app.tables.firstMatch.exists ? app.tables.firstMatch : app.scrollViews.firstMatch)
            if region.exists {
                region.coordinate(withNormalizedOffset: CGVector(dx: 0.03, dy: 0.85))
                    .press(forDuration: 0.05, thenDragTo: region.coordinate(withNormalizedOffset: CGVector(dx: 0.03, dy: 0.2)))
            } else { app.swipeUp() }
        }
        XCTAssertTrue(element.isHittable)
    }

    func testNumbersNavigation() {
        app.buttons["lesson-menu"].tap()
        app.buttons["Цифры и знаки"].tap()
        XCTAssertTrue(app.navigationBars["Цифры и знаки"].waitForExistence(timeout: 10))
        let reference = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Образец 3")).firstMatch
        XCTAssertTrue(reference.waitForExistence(timeout: 10))
        reference.tap()
        XCTAssertFalse(app.buttons["Завершить занятие"].exists)
        XCTAssertFalse(app.buttons["independent-toggle"].exists)
        attach("native-numbers")
        app.navigationBars["Цифры и знаки"].buttons.element(boundBy: 0).tap()
        XCTAssertTrue(app.buttons["show-letters"].waitForExistence(timeout: 5))
        app.buttons["show-letters"].tap()
        XCTAssertTrue(app.buttons["letter-410"].waitForExistence(timeout: 5))
        app.buttons["close-sheet"].tap()
    }

    func testNativeCanary() {
        app.buttons["show-letters"].tap()
        XCTAssertTrue(app.buttons["letter-41e"].waitForExistence(timeout: 5))
        attach("native-letters")
        app.buttons["letter-41e"].tap()
        XCTAssertTrue(app.buttons["close-sheet"].waitForNonExistence(timeout: 5))
        settings()
        app.segmentedControls.buttons["Точнее"].tap()
        XCTAssertTrue(app.segmentedControls.buttons["Точнее"].isSelected)
        app.segmentedControls.buttons["Обычно"].tap()
        attach("native-settings")
        close()
        app.buttons["Образец"].tap()
        XCTAssertTrue(app.navigationBars["Образец"].waitForExistence(timeout: 5))
        attach("native-sample")
        close()
        app.terminate(); app.launch()
        let letter = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Буква О, проба 1")).firstMatch
        XCTAssertTrue(letter.waitForExistence(timeout: 15))
        select("410")
        let upper = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Буква А, проба 1")).firstMatch
        XCTAssertTrue(upper.waitForExistence(timeout: 5))
        attach("native-workspace")
    }

    func testNativeToolbarEdges() {
        orient(.portrait)
        for edge in [0.08, 0.92] {
            for (button, title) in [("show-letters", "Буквы"), ("Образец", "Образец"), ("lesson-menu", "Настройки")] {
                app.buttons[button].coordinate(withNormalizedOffset: CGVector(dx: edge, dy: 0.5)).tap()
                if button == "lesson-menu" { app.buttons["Настройки"].tap() }
                XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 5), button)
                app.buttons["close-sheet"].coordinate(withNormalizedOffset: CGVector(dx: edge, dy: 0.5)).tap()
                XCTAssertTrue(app.buttons["close-sheet"].waitForNonExistence(timeout: 5))
            }
        }
        attach("native-toolbar-edges")
    }

    func testPhysicalLandscapePresentation() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Windowed simulator: layout sizes are covered by testNativeLayoutSizes; physical rotation needs the device lane.")
        #else
        orient(.landscapeLeft)
        XCTAssertTrue(app.buttons["lesson-menu"].isHittable)
        attach("physical-native-landscape")
        #endif
    }

    func testNativeInsetCanary() {
        settings()
        let developer = app.buttons["Для разработки"]
        scrollTo(developer); developer.tap()
        let slider = app.sliders["setting-leftInset"]
        scrollTo(slider); slider.adjust(toNormalizedSliderPosition: 0.6)
        let value = slider.value as? String
        attach("inset-before-close")
        close()
        XCUIDevice.shared.press(.home)
        app.terminate(); app.launch()
        settings(); scrollTo(developer); developer.tap()
        scrollTo(slider)
        attach("inset-after-relaunch")
        XCTAssertEqual(slider.value as? String, value)
        close()
    }

    func testNativeAllSlidersPersist() {
        settings()
        let pen = app.sliders["setting-penWidth"]
        pen.adjust(toNormalizedSliderPosition: 0.6)
        let expectedPen = pen.value as? String
        app.buttons["smoothing-mode"].tap(); app.buttons["Мягкое"].tap()
        let expectedSmoothing = app.buttons["smoothing-mode"].value as? String
        let developer = app.buttons["Для разработки"]
        scrollTo(developer); developer.tap()
        let keys = ["size", "bold", "rowGap", "leftInset", "columnGap", "letterGap", "tolerance"]
        var values: [String: String] = [:]
        for key in keys {
            let slider = app.sliders["setting-" + key]
            scrollTo(slider); slider.adjust(toNormalizedSliderPosition: 0.6)
            values[key] = slider.value as? String
        }
        close()
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
        app.terminate(); app.launch()
        settings()
        XCTAssertEqual(app.sliders["setting-penWidth"].value as? String, expectedPen)
        XCTAssertEqual(app.buttons["smoothing-mode"].value as? String, expectedSmoothing)
        scrollTo(developer); developer.tap()
        for key in keys {
            let slider = app.sliders["setting-" + key]
            scrollTo(slider); XCTAssertEqual(slider.value as? String, values[key], key)
        }
        let defaults = app.buttons["Сбросить технические настройки"]
        scrollTo(defaults); defaults.tap(); close()
    }

    func testNativeDeveloperProgressAndResult() {
        select("410")
        app.buttons["Завершить занятие"].tap()
        XCTAssertTrue(app.navigationBars["Занятие сохранено"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Сложность"].exists)
        attach("native-result")
        close()
        app.buttons["lesson-menu"].tap(); app.buttons["Моя практика"].tap()
        XCTAssertTrue(app.navigationBars["Моя практика"].waitForExistence(timeout: 5))
        attach("native-progress")
        close()
        settings()
        let developer = app.buttons["Для разработки"]
        scrollTo(developer); developer.tap()
        let size = app.sliders["setting-size"]
        XCTAssertTrue(size.waitForExistence(timeout: 5))
        size.adjust(toNormalizedSliderPosition: 0.55)
        let repeats = app.buttons["practice-repeats"]
        scrollTo(repeats); repeats.tap(); app.buttons["6"].tap()
        let editor = app.buttons["Состав текущей страницы"]
        scrollTo(editor); editor.tap()
        XCTAssertTrue(app.navigationBars["Состав страницы"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Рисунок для дорисовки"].waitForExistence(timeout: 10))
        attach("native-author-editor")
        close()
        let sixth = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Буква А, проба 6")).firstMatch
        XCTAssertTrue(sixth.waitForExistence(timeout: 5))
        settings(); scrollTo(developer); developer.tap()
        let defaults = app.buttons["Сбросить технические настройки"]
        scrollTo(defaults); defaults.tap(); close()
        app.buttons["independent-toggle"].tap()
        let independent = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Самостоятельно: а")).firstMatch
        XCTAssertTrue(independent.waitForExistence(timeout: 5))
        app.buttons["independent-toggle"].tap()
    }

    func testNativeDrawingAndUndo() {
        select("410")
        let canvas = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Буква А, проба 2")).firstMatch
        scrollTo(canvas)
        settings()
        let stylus = app.switches["Только стилусом"]
        if stylus.value as? String == "1" { stylus.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap() }
        XCTAssertEqual(stylus.value as? String, "0")
        close()
        canvas.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.8))
            .press(forDuration: 0.05, thenDragTo: canvas.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0.2)))
        let undo = app.buttons["Отменить последнее действие"]
        XCTAssertTrue(undo.isEnabled)
        undo.tap()
        XCTAssertFalse(undo.isEnabled)
        settings()
        if stylus.value as? String == "0" { stylus.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap() }
        XCTAssertEqual(stylus.value as? String, "1")
        close()
        orient(.portrait)
        do {
            for label in ["show-letters", "Образец", "lesson-menu"] {
                let frame = app.buttons[label].frame
                XCTAssertGreaterThanOrEqual(frame.width, 44, label + " " + frame.debugDescription)
                XCTAssertGreaterThanOrEqual(frame.height, 44, label + " " + frame.debugDescription)
                XCTAssertLessThanOrEqual(frame.maxX, app.frame.maxX)
            }
            XCTAssertTrue(app.buttons["lesson-menu"].isHittable)
            attach("native-portrait")
        }
    }

    func testNativeBackupRoundtrip() {
        select("410")
        func export() { app.buttons["lesson-menu"].tap(); app.buttons["Сохранить копию…"].tap() }
        export()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 10))
        app.buttons["Cancel"].tap()
        export()
        XCTAssertTrue(app.buttons["Save"].waitForExistence(timeout: 10))
        app.cells["DOC.sidebar.item.On My iPad"].tap()
        let name = "gost-native-" + UUID().uuidString.prefix(8)
        let filename = app.textFields["DOCPicker.filenameTextField"]
        filename.tap()
        filename.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (filename.value as? String ?? "").count) + name)
        app.buttons["Save"].tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForNonExistence(timeout: 10))
        let score = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Сходство ")).firstMatch
        scrollTo(score)
        let previous = score.label
        score.tap(); app.buttons["Сбросить эту пробу"].tap()
        settings()
        let open = app.buttons["Открыть копию…"]
        scrollTo(open); open.tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 10))
        app.cells["DOC.sidebar.item.On My iPad"].tap()
        let file = app.cells.matching(NSPredicate(format: "label CONTAINS %@", String(name))).firstMatch
        XCTAssertTrue(file.waitForExistence(timeout: 10)); file.tap()
        let restore = app.buttons["Восстановить"]
        XCTAssertTrue(restore.waitForExistence(timeout: 10)); scrollTo(restore); restore.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Добавлено проб: 1")).firstMatch.waitForExistence(timeout: 5))
        attach("native-restored-backup")
        close()
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons[previous].waitForExistence(timeout: 15))
    }

    func testInstalledNativePresentation() {
        let installed = XCUIApplication(bundleIdentifier: "md.dcor.bukvygost.pilot")
        installed.launch()
        XCTAssertTrue(installed.buttons["lesson-menu"].waitForExistence(timeout: 15))
        installed.buttons["lesson-menu"].tap(); installed.buttons["Настройки"].tap()
        XCTAssertTrue(installed.navigationBars["Настройки"].waitForExistence(timeout: 5))
        attach("installed-native-settings")
        installed.buttons["close-sheet"].tap()
        attach("installed-native-workspace")
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
