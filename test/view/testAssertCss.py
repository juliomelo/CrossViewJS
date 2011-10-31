from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import unittest, time, re, os

class TestAssertCss(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Firefox()
        self.driver.implicitly_wait(0)
        self.base_url = "http://juliomelo.github.com/"
        self.verificationErrors = []
    
    def test_assert_css(self):
        driver = self.driver
        driver.get("file:///" + os.path.dirname(os.getcwd() + "/" +  __file__) + "/assertCss.html")
        for i in range(30):
            try:
                if self.is_element_present(By.CSS_SELECTOR, "#twitter.crossview-fetching"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        self.assertEqual(1, len(driver.find_elements_by_css_selector(".crossview-fetching")))
        for i in range(5):
            try:
                if self.is_element_present(By.CSS_SELECTOR, "div.tweet"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        self.assertEqual(0, len(driver.find_elements_by_css_selector(".crossview-fetching")))
        driver.find_element_by_id("query").clear()
        driver.find_element_by_id("query").send_keys("bach")
        driver.find_element_by_css_selector("input[type=\"submit\"]").click()
        self.assertEqual(2, len(driver.find_elements_by_css_selector(".crossview-fetching")))
        for i in range(10):
            try:
                if self.is_element_present(By.CSS_SELECTOR, "h3"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        self.assertEqual(0, len(driver.find_elements_by_css_selector(".crossview-fetching")))
    
    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException, e: return False
        return True
    
    def tearDown(self):
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

if __name__ == "__main__":
    unittest.main()
