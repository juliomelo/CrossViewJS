from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import unittest, time, re, os

class TestRenderFormSubmission(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Firefox()
        self.driver.implicitly_wait(30)
        self.base_url = "http://change-this-to-the-site-you-are-testing/"
        self.verificationErrors = []
    
    def test_render_form_submission(self):
        driver = self.driver
        driver.get("file:///" + os.path.dirname(os.getcwd() + "/" +  __file__) + "/post.html")
        for i in range(60):
            try:
                if self.is_element_present(By.CSS_SELECTOR, ".tweet"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        self.assertEqual(5, len(driver.find_elements_by_css_selector(".tweet")))
        driver.find_element_by_id("query").clear()
        driver.find_element_by_id("query").send_keys("unit test")
        driver.execute_script("$('.tweet').remove();");
        driver.find_element_by_css_selector("input[type=\"submit\"]").click()
        for i in range(60):
            try:
                if self.is_element_present(By.CSS_SELECTOR, ".tweet"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        if len(driver.find_elements_by_xpath("//p[contains(., 'unit')]")) == 0: self.fail("Text not found")
        if len(driver.find_elements_by_xpath("//p[contains(., 'test')]")) == 0: self.fail("Text not found")
    
    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException, e: return False
        return True
    
    def tearDown(self):
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

if __name__ == "__main__":
    unittest.main()
