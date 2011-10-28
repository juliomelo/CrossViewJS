from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import unittest, time, re, os

class TestMultipleViews(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Firefox()
        self.driver.implicitly_wait(30)
        self.base_url = "http://juliomelo.github.com/"
        self.verificationErrors = []
    
    def test_multiple_views(self):
        driver = self.driver
        driver.get("file:///" + os.path.dirname(os.getcwd() + "/" +  __file__) + "/multipleViews.html")
        driver.find_element_by_id("query").clear()
        driver.find_element_by_id("query").send_keys("world")
        driver.find_element_by_css_selector("input[type=\"submit\"]").click()
        for i in range(60):
            try:
                if self.is_element_present(By.XPATH, "//div[@id='resultInfo']/div/span[3]"): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        self.assertEqual("world", driver.find_element_by_xpath("//div[@id='resultInfo']/div/span[2]").text)
        self.assertTrue(self.is_element_present(By.CSS_SELECTOR, "img"))
        self.assertTrue(self.is_element_present(By.CSS_SELECTOR, "div.createdAt"))
    
    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException, e: return False
        return True
    
    def tearDown(self):
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

if __name__ == "__main__":
    unittest.main()
