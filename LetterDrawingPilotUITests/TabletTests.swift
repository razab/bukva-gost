import XCTest

final class TabletTests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "md.dcor.bukvygost.pilot.qa")

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.buttons["Образец"].waitForExistence(timeout: 15))
    }

    override func tearDownWithError() throws {
        XCUIDevice.shared.orientation = .portrait
    }

    func testBackupFilePanels() {
        app.buttons["Настройки"].tap()
        let export = app.buttons["Сохранить копию"]
        for _ in 0..<3 where !export.isHittable { app.swipeUp() }
        XCTAssertTrue(export.isHittable)
        export.tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 10))
        attach("backup-export")
        app.buttons["Cancel"].tap()
        XCTAssertTrue(app.buttons["Закрыть настройки"].exists)
        export.tap()
        XCTAssertTrue(app.buttons["Save"].waitForExistence(timeout: 10))
        app.cells["DOC.sidebar.item.On My iPad"].tap()
        let name = "gost-qa-" + UUID().uuidString.prefix(8)
        let filename = app.textFields["DOCPicker.filenameTextField"]
        filename.tap()
        filename.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (filename.value as? String ?? "").count) + name)
        app.buttons["Save"].tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForNonExistence(timeout: 10))
        app.buttons["Закрыть настройки"].tap()
        let score = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Сходство ")).firstMatch
        for _ in 0..<4 where !score.isHittable { app.swipeUp() }
        XCTAssertTrue(score.isHittable)
        let originalScore = score.label
        score.tap()
        app.buttons["Сбросить эту пробу"].tap()
        app.buttons["Настройки"].tap()
        let open = app.buttons["Открыть копию"]
        for _ in 0..<3 where !open.isHittable { app.swipeUp() }
        open.tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 10))
        app.cells["DOC.sidebar.item.On My iPad"].tap()
        let file = app.cells.matching(NSPredicate(format: "label CONTAINS %@", String(name))).firstMatch
        XCTAssertTrue(file.waitForExistence(timeout: 10))
        file.tap()
        let restore = app.buttons["Восстановить"]
        XCTAssertTrue(restore.waitForExistence(timeout: 10))
        for _ in 0..<3 where !restore.isHittable { app.swipeUp() }
        restore.tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Добавлено проб: 1")).firstMatch.waitForExistence(timeout: 5))
        attach("backup-restored")
        app.buttons["Закрыть настройки"].tap()
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons[originalScore].waitForExistence(timeout: 15))
    }

    func testCoursePickerAndProgress() {
        app.buttons["Буквы"].tap()
        XCTAssertTrue(app.buttons["Закрыть выбор букв"].waitForExistence(timeout: 5))
        attach("all-letters")
        app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "О о.")).firstMatch.tap()
        let practice = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Буква О, проба 1")).firstMatch
        XCTAssertTrue(practice.waitForExistence(timeout: 5))
        app.buttons["Прогресс"].tap()
        XCTAssertTrue(app.buttons["Закрыть прогресс"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Занятий:")).firstMatch.exists)
        attach("course-progress")
        app.buttons["Закрыть прогресс"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(practice.waitForExistence(timeout: 15))
        app.buttons["Буквы"].tap()
        app.switches.matching(NSPredicate(format: "label BEGINSWITH %@", "А а.")).firstMatch.tap()
    }

    func testInstalledAppOpensCompleteCourse() {
        let installed = XCUIApplication(bundleIdentifier: "md.dcor.bukvygost.pilot")
        installed.launch()
        XCTAssertTrue(installed.buttons["Буквы"].waitForExistence(timeout: 15))
        for label in ["Буквы", "Образец", "Прогресс", "Отменить последнее действие", "Настройки"] {
            let frame = installed.buttons[label].frame
            XCTAssertGreaterThanOrEqual(frame.width, 44, label)
            XCTAssertGreaterThanOrEqual(frame.height, 44, label)
        }
        installed.buttons["Буквы"].tap()
        XCTAssertTrue(installed.buttons["Закрыть выбор букв"].waitForExistence(timeout: 5))
        XCTAssertEqual(installed.switches.count, 33)
        attach("installed-full-course")
        installed.buttons["Закрыть выбор букв"].tap()
    }

    func testSampleSettingsAndFingerScroll() {
        app.buttons["Образец"].tap()
        XCTAssertTrue(app.buttons["Закрыть образец"].waitForExistence(timeout: 5))
        app.buttons["Закрыть образец"].tap()

        app.buttons["Настройки"].tap()
        XCTAssertTrue(app.buttons["Закрыть настройки"].waitForExistence(timeout: 5))
        let precise = app.switches["Точнее"]
        let standard = app.switches["Обычно"]
        precise.tap()
        XCTAssertEqual(precise.value as? String, "1")
        standard.tap()
        XCTAssertEqual(standard.value as? String, "1")
        app.buttons["Для разработки"].tap()
        XCTAssertTrue(app.staticTexts["Повторы букв и элементов"].waitForExistence(timeout: 5))
        app.buttons["Закрыть настройки"].tap()

        let upperLetter = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == %@", "Буква А, проба 1")).firstMatch
        let top = app.webViews.firstMatch
        let before = upperLetter.frame.minY
        top.swipeUp()
        XCTAssertLessThan(upperLetter.frame.minY, before - 40)
        top.swipeDown()
        XCTAssertTrue(app.buttons["Образец"].isHittable)
        attach("portrait")
    }

    func testLandscapeAndRelaunch() {
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.buttons["Образец"].waitForExistence(timeout: 5))
        XCTAssertGreaterThan(app.frame.width, app.frame.height)
        app.buttons["Образец"].tap()
        XCTAssertTrue(app.buttons["Закрыть образец"].waitForExistence(timeout: 5))
        attach("landscape-sample")
        app.buttons["Закрыть образец"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Образец"].waitForExistence(timeout: 15))
        XCTAssertGreaterThan(app.webViews.firstMatch.frame.width, app.webViews.firstMatch.frame.height)
        attach("landscape-relaunch")
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
